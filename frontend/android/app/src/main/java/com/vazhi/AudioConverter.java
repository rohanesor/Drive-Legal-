package com.vazhi;

import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * AudioConverter - High-speed native Android hardware audio decoder.
 * 
 * Uses standard built-in MediaExtractor and MediaCodec APIs to decode
 * compressed formats (AAC, MP4, 3GP, M4A) and output a standardized
 * 16kHz, Mono, 16-bit signed PCM WAV file optimized for Whisper.cpp transcription.
 */
public class AudioConverter {
    private static final String TAG = "AudioConverter";

    public static boolean convertToWav(String sourcePath, String destPath) {
        Log.d(TAG, "Converting " + sourcePath + " to " + destPath);
        File sourceFile = new File(sourcePath);
        if (!sourceFile.exists()) {
            Log.e(TAG, "Source file does not exist: " + sourcePath);
            return false;
        }

        MediaExtractor extractor = new MediaExtractor();
        MediaCodec decoder = null;
        FileOutputStream fos = null;

        try {
            extractor.setDataSource(sourcePath);
            int trackIndex = -1;
            MediaFormat format = null;
            String mime = "";

            for (int i = 0; i < extractor.getTrackCount(); i++) {
                MediaFormat f = extractor.getTrackFormat(i);
                String m = f.getString(MediaFormat.KEY_MIME);
                if (m != null && m.startsWith("audio/")) {
                    trackIndex = i;
                    format = f;
                    mime = m;
                    break;
                }
            }

            if (trackIndex == -1) {
                Log.e(TAG, "No audio track found in source file.");
                return false;
            }

            extractor.selectTrack(trackIndex);
            
            // Fetch source metadata
            int sourceSampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE);
            int sourceChannels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
            Log.d(TAG, "Source audio details: SampleRate=" + sourceSampleRate + ", Channels=" + sourceChannels + ", Mime=" + mime);

            // Initialize Decoder
            decoder = MediaCodec.createDecoderByType(mime);
            decoder.configure(format, null, null, 0);
            decoder.start();

            fos = new FileOutputStream(destPath);
            // Write placeholder WAV header (44 bytes), updated at completion
            byte[] header = new byte[44];
            fos.write(header);

            ByteBuffer[] inputBuffers = decoder.getInputBuffers();
            ByteBuffer[] outputBuffers = decoder.getOutputBuffers();
            MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();

            boolean isInputEOS = false;
            boolean isOutputEOS = false;
            long totalAudioLen = 0;

            // Decodification & Re-sampling Loop (supports continuous streaming)
            while (!isOutputEOS) {
                if (!isInputEOS) {
                    int inIndex = decoder.dequeueInputBuffer(10000);
                    if (inIndex >= 0) {
                        ByteBuffer buffer = inputBuffers[inIndex];
                        int sampleSize = extractor.readSampleData(buffer, 0);
                        if (sampleSize < 0) {
                            decoder.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
                            isInputEOS = true;
                        } else {
                            decoder.queueInputBuffer(inIndex, 0, sampleSize, extractor.getSampleTime(), 0);
                            extractor.advance();
                        }
                    }
                }

                int outIndex = decoder.dequeueOutputBuffer(info, 10000);
                if (outIndex >= 0) {
                    ByteBuffer buffer = outputBuffers[outIndex];
                    byte[] chunk = new byte[info.size];
                    buffer.get(chunk);
                    buffer.clear();

                    // Downsample raw PCM (source format -> 16kHz Mono)
                    byte[] processedChunk = downsamplePCM(chunk, sourceSampleRate, sourceChannels, 16000);
                    fos.write(processedChunk);
                    totalAudioLen += processedChunk.length;

                    decoder.releaseOutputBuffer(outIndex, false);

                    if ((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                        isOutputEOS = true;
                    }
                } else if (outIndex == MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED) {
                    outputBuffers = decoder.getOutputBuffers();
                } else if (outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    MediaFormat newFormat = decoder.getOutputFormat();
                    sourceSampleRate = newFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
                    sourceChannels = newFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
                    Log.d(TAG, "Format changed: SampleRate=" + sourceSampleRate + ", Channels=" + sourceChannels);
                }
            }

            fos.close();
            fos = null;

            // Overwrite correct WAV header values at offset 0
            writeWavHeader(destPath, totalAudioLen, 16000, 1);
            Log.d(TAG, "Successfully converted audio to 16kHz mono WAV. Data length: " + totalAudioLen);
            return true;

        } catch (Exception e) {
            Log.e(TAG, "Audio conversion crash: ", e);
            return false;
        } finally {
            if (extractor != null) {
                extractor.release();
            }
            if (decoder != null) {
                decoder.stop();
                decoder.release();
            }
            if (fos != null) {
                try { fos.close(); } catch (IOException ignored) {}
            }
        }
    }

    /**
     * Converts a raw 16-bit PCM byte array to target 16kHz Mono 16-bit signed PCM.
     */
    private static byte[] downsamplePCM(byte[] sourceBytes, int srcSR, int srcChannels, int destSR) {
        if (sourceBytes.length == 0) return sourceBytes;

        // Convert bytes to shorts
        int numShorts = sourceBytes.length / 2;
        short[] sourceSamples = new short[numShorts];
        ByteBuffer.wrap(sourceBytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(sourceSamples);

        // 1. Channel Reduction (Stereo -> Mono)
        short[] monoSamples;
        if (srcChannels > 1) {
            monoSamples = new short[numShorts / srcChannels];
            for (int i = 0; i < monoSamples.length; i++) {
                int sum = 0;
                for (int c = 0; c < srcChannels; c++) {
                    sum += sourceSamples[i * srcChannels + c];
                }
                monoSamples[i] = (short) (sum / srcChannels);
            }
        } else {
            monoSamples = sourceSamples;
        }

        // 2. Sample Rate Conversion (Linear Interpolation)
        if (srcSR == destSR) {
            byte[] destBytes = new byte[monoSamples.length * 2];
            ByteBuffer.wrap(destBytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().put(monoSamples);
            return destBytes;
        }

        double ratio = (double) srcSR / destSR;
        int destLength = (int) (monoSamples.length / ratio);
        short[] destSamples = new short[destLength];

        for (int i = 0; i < destLength; i++) {
            double srcIdx = i * ratio;
            int lowIdx = (int) Math.floor(srcIdx);
            int highIdx = Math.min(lowIdx + 1, monoSamples.length - 1);
            double weight = srcIdx - lowIdx;
            
            if (lowIdx < monoSamples.length) {
                destSamples[i] = (short) ((1.0 - weight) * monoSamples[lowIdx] + weight * monoSamples[highIdx]);
            }
        }

        byte[] destBytes = new byte[destSamples.length * 2];
        ByteBuffer.wrap(destBytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().put(destSamples);
        return destBytes;
    }

    /**
     * Writes standard 44-byte WAV header at the beginning of the file.
     */
    private static void writeWavHeader(String filePath, long totalAudioLen, int sampleRate, int channels) {
        long totalDataLen = totalAudioLen + 36;
        long byteRate = sampleRate * channels * 2; // 16-bit PCM (2 bytes/sample)

        byte[] header = new byte[44];
        header[0] = 'R'; // RIFF
        header[1] = 'I';
        header[2] = 'F';
        header[3] = 'F';
        
        // File size - 8 bytes
        header[4] = (byte) (totalDataLen & 0xff);
        header[5] = (byte) ((totalDataLen >> 8) & 0xff);
        header[6] = (byte) ((totalDataLen >> 16) & 0xff);
        header[7] = (byte) ((totalDataLen >> 24) & 0xff);
        
        header[8] = 'W'; // WAVE
        header[9] = 'A';
        header[10] = 'V';
        header[11] = 'E';
        
        header[12] = 'f'; // fmt 
        header[13] = 'm';
        header[14] = 't';
        header[15] = ' ';
        
        header[16] = 16; // Sub-chunk size (16 for PCM)
        header[17] = 0;
        header[18] = 0;
        header[19] = 0;
        
        header[20] = 1; // Audio format (1 for PCM)
        header[21] = 0;
        
        header[22] = (byte) channels;
        header[23] = 0;
        
        header[24] = (byte) (sampleRate & 0xff);
        header[25] = (byte) ((sampleRate >> 8) & 0xff);
        header[26] = (byte) ((sampleRate >> 16) & 0xff);
        header[27] = (byte) ((sampleRate >> 24) & 0xff);
        
        header[28] = (byte) (byteRate & 0xff);
        header[29] = (byte) ((byteRate >> 8) & 0xff);
        header[30] = (byte) ((byteRate >> 16) & 0xff);
        header[31] = (byte) ((byteRate >> 24) & 0xff);
        
        header[32] = 2; // Block align (channels * 2 bytes/sample)
        header[33] = 0;
        header[34] = 16; // Bits per sample (16 bits)
        header[35] = 0;
        
        header[36] = 'd'; // data chunk
        header[37] = 'a';
        header[38] = 't';
        header[39] = 'a';
        
        header[40] = (byte) (totalAudioLen & 0xff);
        header[41] = (byte) ((totalAudioLen >> 8) & 0xff);
        header[42] = (byte) ((totalAudioLen >> 16) & 0xff);
        header[43] = (byte) ((totalAudioLen >> 24) & 0xff);

        RandomAccessFile raf = null;
        try {
            raf = new RandomAccessFile(filePath, "rw");
            raf.seek(0);
            raf.write(header);
            raf.close();
        } catch (Exception e) {
            Log.e(TAG, "Header writing failed: ", e);
        } finally {
            if (raf != null) {
                try { raf.close(); } catch (IOException ignored) {}
            }
        }
    }
}


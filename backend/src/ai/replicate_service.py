import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

class ReplicateService:
    """
    Service layer for integrating Replicate API:
    - AI Intelligence: openai/gpt-5-pro
    - Expressive TTS: google/gemini-3.1-flash-tts
    """

    @staticmethod
    def get_token() -> str:
        token = os.environ.get('REPLICATE_API_TOKEN', '').strip()
        if not token:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            candidate_paths = [
                os.path.join(base_dir, '..', '..', '.env'),
                os.path.join(base_dir, '..', '.env'),
                os.path.join(os.getcwd(), '.env'),
                os.path.join(os.getcwd(), 'backend', '.env'),
                '/home/ubuntu/DriveLegal/backend/.env',
                '/app/.env'
            ]
            for env_file in candidate_paths:
                if os.path.exists(env_file):
                    try:
                        with open(env_file, 'r', encoding='utf-8') as f:
                            for line in f:
                                if line.startswith('REPLICATE_API_TOKEN='):
                                    token = line.split('=', 1)[1].strip().strip('"').strip("'")
                                    if token:
                                        break
                    except Exception:
                        pass
                if token:
                    break
        return token

    @staticmethod
    def generate_gpt5_response(prompt: str, system_prompt: str = "", async_mode: bool = False) -> Dict[str, Any]:
        """
        Runs openai/gpt-5-pro using Replicate HTTP REST API.
        """
        token = ReplicateService.get_token()
        if not token:
            return {
                "status": "error",
                "message": "REPLICATE_API_TOKEN environment variable is not set.",
                "response": "Please set REPLICATE_API_TOKEN in your environment or backend/.env file."
            }

        url = "https://api.replicate.com/v1/models/openai/gpt-5-pro/predictions"
        headers = {
            "Authorization": f"Token {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": {
                "prompt": prompt,
                "system_prompt": system_prompt or "You are Vazhi AI, an intelligent driving co-pilot providing real-time navigation, road safety, and legal guidance."
            }
        }

        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                prediction_id = data.get('id')
                status = data.get('status')
                
                if async_mode:
                    return {"status": "processing", "model": "openai/gpt-5-pro", "prediction_id": prediction_id}

                if status == 'succeeded':
                    output = data.get('output', '')
                    res_text = "".join(output) if isinstance(output, list) else str(output)
                    return {"status": "success", "model": "openai/gpt-5-pro", "response": res_text}
                else:
                    return ReplicateService.poll_prediction(prediction_id, token)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            return {"status": "error", "message": f"HTTP Error {e.code}: {e.reason}", "detail": err_body}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def get_prediction_status(prediction_id: str) -> Dict[str, Any]:
        """
        Fetches single prediction status from Replicate API.
        """
        token = ReplicateService.get_token()
        if not token:
            return {"status": "error", "message": "REPLICATE_API_TOKEN missing."}

        url = f"https://api.replicate.com/v1/predictions/{prediction_id}"
        headers = {"Authorization": f"Token {token}"}
        try:
            req = urllib.request.Request(url, headers=headers, method='GET')
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                status = data.get('status')
                if status == 'succeeded':
                    output = data.get('output', '')
                    res_text = "".join(output) if isinstance(output, list) else str(output)
                    return {"status": "success", "prediction_status": "succeeded", "response": res_text}
                elif status in ['starting', 'processing']:
                    return {"status": "processing", "prediction_status": status, "prediction_id": prediction_id}
                else:
                    return {"status": "error", "prediction_status": status, "detail": data.get('error')}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def generate_gemini_tts(text: str, voice: str = "Algenib") -> Dict[str, Any]:
        """
        Runs google/gemini-3.1-flash-tts using Replicate HTTP REST API.
        Returns the output audio file URL.
        """
        token = ReplicateService.get_token()
        if not token:
            return {
                "status": "error",
                "message": "REPLICATE_API_TOKEN environment variable is not set."
            }

        url = "https://api.replicate.com/v1/models/google/gemini-3.1-flash-tts/predictions"
        headers = {
            "Authorization": f"Token {token}",
            "Content-Type": "application/json",
            "Prefer": "wait"
        }

        payload = {
            "input": {
                "text": text,
                "voice": voice
            }
        }

        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                status = data.get('status')
                prediction_id = data.get('id')

                if status == 'succeeded':
                    output_url = data.get('output', '')
                    if isinstance(output_url, dict) and 'url' in output_url:
                        output_url = output_url['url']
                    return {"status": "success", "model": "google/gemini-3.1-flash-tts", "audioUrl": str(output_url)}
                elif status in ['starting', 'processing']:
                    res = ReplicateService.poll_prediction(prediction_id, token)
                    if res.get('status') == 'success':
                        audio_url = res.get('response', '')
                        return {"status": "success", "model": "google/gemini-3.1-flash-tts", "audioUrl": str(audio_url)}
                    return res
                else:
                    return {"status": "error", "message": f"TTS status: {status}", "error_detail": data.get('error')}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8') if e.fp else str(e)
            return {"status": "error", "message": f"HTTP Error {e.code}: {e.reason}", "detail": err_body}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def poll_prediction(prediction_id: str, token: str, max_retries: int = 60) -> Dict[str, Any]:
        import time
        url = f"https://api.replicate.com/v1/predictions/{prediction_id}"
        headers = {"Authorization": f"Token {token}"}

        for _ in range(max_retries):
            time.sleep(1.5)
            try:
                req = urllib.request.Request(url, headers=headers, method='GET')
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    status = data.get('status')
                    if status == 'succeeded':
                        output = data.get('output', '')
                        res_text = "".join(output) if isinstance(output, list) else str(output)
                        return {"status": "success", "response": res_text}
                    elif status in ['failed', 'canceled']:
                        return {"status": "error", "message": f"Prediction {status}", "detail": data.get('error')}
            except Exception as e:
                pass
        return {"status": "error", "message": "Prediction polling timed out."}

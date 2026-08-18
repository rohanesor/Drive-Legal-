import os
from PIL import Image, ImageDraw

def generate_vazhi_launcher_icons():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    res_dir = os.path.join(root_dir, 'frontend', 'android', 'app', 'src', 'main', 'res')
    
    sizes = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192
    }
    
    for folder, size in sizes.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # High resolution canvas for super-sampling
        base_size = 512
        img = Image.new("RGBA", (base_size, base_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Dark Cockpit Background (#0A0F1D to #131C31)
        r = 112
        draw.rounded_rectangle([(0, 0), (base_size, base_size)], radius=r, fill=(10, 15, 29, 255), outline=(42, 59, 92, 255), width=8)
        
        # 3D Perspective Road Corridor (#1D2A47)
        draw.polygon([(128, 430), (384, 430), (310, 210), (202, 210)], fill=(29, 42, 71, 230))
        
        # 3D Glowing Beam (#00E5FF)
        draw.line([(256, 410), (256, 230), (320, 130)], fill=(0, 229, 255, 255), width=18)
        
        # Master Directional Arrow (Mint #00FFC2)
        arrow = [(256, 105), (376, 365), (256, 310), (136, 365)]
        draw.polygon(arrow, fill=(0, 255, 194, 255))
        
        # Inner Chevron Accent
        inner_chevron = [(256, 165), (326, 325), (256, 290), (186, 325)]
        draw.polygon(inner_chevron, fill=(10, 15, 29, 180))
        
        # Resize to target density with LANCZOS high-quality resampling
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Save ic_launcher.png
        icon_path = os.path.join(folder_path, 'ic_launcher.png')
        resized.save(icon_path, "PNG")
        
        # Round icon version
        mask = Image.new("L", (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse([(0, 0), (size, size)], fill=255)
        
        round_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        round_img.paste(resized, (0, 0), mask)
        
        round_path = os.path.join(folder_path, 'ic_launcher_round.png')
        round_img.save(round_path, "PNG")
        
        print(f"[Vazhi Icon System] Generated {folder} ({size}x{size}): ic_launcher.png & ic_launcher_round.png")

if __name__ == '__main__':
    generate_vazhi_launcher_icons()

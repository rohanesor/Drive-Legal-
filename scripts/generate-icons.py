import os
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM

def generate_icons():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    svg_path = os.path.join(root_dir, 'assets', 'branding', 'vazhi-icon.svg')
    
    print(f"Loading master SVG icon from: {svg_path}")
    drawing = svg2rlg(svg_path)
    
    sizes = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192
    }
    
    res_dir = os.path.join(root_dir, 'frontend', 'android', 'app', 'src', 'main', 'res')
    
    for folder, size in sizes.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Scale drawing
        scale_factor = size / 512.0
        drawing.width = size
        drawing.height = size
        drawing.scale(scale_factor, scale_factor)
        
        icon_path = os.path.join(folder_path, 'ic_launcher.png')
        round_path = os.path.join(folder_path, 'ic_launcher_round.png')
        
        renderPM.drawToFile(drawing, icon_path, fmt='PNG')
        renderPM.drawToFile(drawing, round_path, fmt='PNG')
        
        print(f"Generated {folder} ({size}x{size}): {icon_path}")

if __name__ == '__main__':
    generate_icons()

import io
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile


def compress_image(image_file, max_size_kb=1024, quality=85):
    """
    Compress an image to be under max_size_kb while maintaining quality.
    
    Args:
        image_file: Django UploadedFile or file-like object
        max_size_kb: Maximum file size in KB (default 1MB)
        quality: Initial JPEG quality (default 85)
    
    Returns:
        InMemoryUploadedFile with compressed image
    """
    # Open the image
    img = Image.open(image_file)
    
    # Convert to RGB if necessary (for PNG with transparency, etc.)
    if img.mode in ('RGBA', 'LA', 'P'):
        # Create a white background
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Get original dimensions
    original_width, original_height = img.size
    
    # Calculate max dimension while maintaining aspect ratio
    max_dimension = 2048  # Max width or height
    if original_width > max_dimension or original_height > max_dimension:
        if original_width > original_height:
            new_width = max_dimension
            new_height = int((max_dimension / original_width) * original_height)
        else:
            new_height = max_dimension
            new_width = int((max_dimension / original_height) * original_width)
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Compress with decreasing quality until under max_size
    output = io.BytesIO()
    current_quality = quality
    
    while current_quality >= 20:
        output.seek(0)
        output.truncate()
        img.save(output, format='JPEG', quality=current_quality, optimize=True)
        size_kb = output.tell() / 1024
        
        if size_kb <= max_size_kb:
            break
        
        current_quality -= 5
    
    # If still too large, resize further
    if output.tell() / 1024 > max_size_kb:
        scale_factor = 0.8
        while output.tell() / 1024 > max_size_kb and scale_factor > 0.3:
            new_size = (int(img.width * scale_factor), int(img.height * scale_factor))
            resized_img = img.resize(new_size, Image.Resampling.LANCZOS)
            output.seek(0)
            output.truncate()
            resized_img.save(output, format='JPEG', quality=current_quality, optimize=True)
            scale_factor -= 0.1
    
    output.seek(0)
    
    # Get original filename and create new filename
    original_name = getattr(image_file, 'name', 'image.jpg')
    if '.' in original_name:
        new_name = original_name.rsplit('.', 1)[0] + '.jpg'
    else:
        new_name = original_name + '.jpg'
    
    # Return as InMemoryUploadedFile
    return InMemoryUploadedFile(
        file=output,
        field_name='image',
        name=new_name,
        content_type='image/jpeg',
        size=output.tell(),
        charset=None
    )


def validate_image_file(file, max_size_mb=5):
    """
    Validate that a file is a valid image and under size limit.
    
    Args:
        file: Uploaded file
        max_size_mb: Maximum file size in MB before compression
    
    Returns:
        tuple: (is_valid, error_message)
    """
    # Check file size
    if file.size > max_size_mb * 1024 * 1024:
        return False, f"File size exceeds {max_size_mb}MB limit"
    
    # Check file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    content_type = getattr(file, 'content_type', '')
    
    if content_type not in allowed_types:
        return False, "Invalid file type. Allowed: JPEG, PNG, GIF, WebP"
    
    # Try to open as image
    try:
        img = Image.open(file)
        img.verify()  # Verify it's a valid image
        file.seek(0)  # Reset file pointer
        return True, None
    except Exception as e:
        return False, f"Invalid image file: {str(e)}"

from rest_framework import serializers
from .models import GalleryCategory, GalleryItem, GalleryImage, GallerySettings, GalleryAnalytics
from .utils import compress_image, validate_image_file


class GalleryImageSerializer(serializers.ModelSerializer):
    """Serializer for gallery images"""
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = GalleryImage
        fields = ['id', 'image', 'image_url', 'display_order', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class GalleryCategorySerializer(serializers.ModelSerializer):
    """Serializer for gallery categories"""
    cover_image_url = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = GalleryCategory
        fields = [
            'id', 'name', 'description', 'cover_image', 'cover_image_url',
            'is_active', 'display_order', 'items_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        return None

    def get_items_count(self, obj):
        return obj.items.filter(is_deleted=False, is_published=True).count()

    def validate_cover_image(self, value):
        if value:
            is_valid, error = validate_image_file(value)
            if not is_valid:
                raise serializers.ValidationError(error)
            return compress_image(value)
        return value


class GalleryItemSerializer(serializers.ModelSerializer):
    """Serializer for gallery items with nested images"""
    images = GalleryImageSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    primary_image_url = serializers.SerializerMethodField()

    class Meta:
        model = GalleryItem
        fields = [
            'id', 'category', 'category_name', 'title', 'description', 'price',
            'availability_status', 'is_featured', 'is_published', 'images',
            'primary_image_url', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_primary_image_url(self, obj):
        first_image = obj.images.first()
        if first_image and first_image.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        return None


class GalleryItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating gallery items with image uploads"""
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = GalleryItem
        fields = [
            'id', 'category', 'title', 'description', 'price',
            'availability_status', 'is_featured', 'is_published', 'images'
        ]
        read_only_fields = ['id']

    def validate_images(self, value):
        if not value:  # Allow empty list
            return []
        if len(value) > 10:
            raise serializers.ValidationError("Maximum 10 images allowed per item")
        
        validated_images = []
        for img in value:
            is_valid, error = validate_image_file(img)
            if not is_valid:
                raise serializers.ValidationError(error)
            validated_images.append(compress_image(img))
        return validated_images

    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        gallery_item = GalleryItem.objects.create(**validated_data)
        
        for idx, image in enumerate(images_data):
            GalleryImage.objects.create(
                gallery_item=gallery_item,
                image=image,
                display_order=idx
            )
        
        return gallery_item


class GalleryItemUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating gallery items"""
    new_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = GalleryItem
        fields = [
            'id', 'category', 'title', 'description', 'price',
            'availability_status', 'is_featured', 'is_published', 'new_images'
        ]
        read_only_fields = ['id']

    def validate_new_images(self, value):
        if value:
            existing_count = self.instance.images.count() if self.instance else 0
            if existing_count + len(value) > 10:
                raise serializers.ValidationError(
                    f"Maximum 10 images allowed. Currently have {existing_count}."
                )
            
            validated_images = []
            for img in value:
                is_valid, error = validate_image_file(img)
                if not is_valid:
                    raise serializers.ValidationError(error)
                validated_images.append(compress_image(img))
            return validated_images
        return value

    def update(self, instance, validated_data):
        new_images = validated_data.pop('new_images', [])
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if new_images:
            current_max_order = instance.images.aggregate(
                max_order=models.Max('display_order')
            )['max_order'] or -1
            
            for idx, image in enumerate(new_images):
                GalleryImage.objects.create(
                    gallery_item=instance,
                    image=image,
                    display_order=current_max_order + idx + 1
                )
        
        return instance


class GallerySettingsSerializer(serializers.ModelSerializer):
    """Serializer for gallery settings"""
    gallery_url = serializers.SerializerMethodField()

    class Meta:
        model = GallerySettings
        fields = [
            'id', 'is_public_enabled', 'show_prices', 'whatsapp_number',
            'enquiry_message_template', 'public_category_ids', 'gallery_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'gallery_url']

    def get_gallery_url(self, obj):
        request = self.context.get('request')
        shop_slug = obj.shop.id  # Using shop ID as slug for now
        if request:
            # Return URL without /api/ prefix
            return f"{request.scheme}://{request.get_host()}/gallery/{shop_slug}"
        return f"/gallery/{shop_slug}"


class GalleryAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for gallery analytics"""

    class Meta:
        model = GalleryAnalytics
        fields = [
            'id', 'date', 'total_views', 'unique_visitors',
            'item_views', 'category_views', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# Public serializers (for unauthenticated access)

class PublicGalleryCategorySerializer(serializers.ModelSerializer):
    """Public serializer for categories (limited fields)"""
    cover_image_url = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = GalleryCategory
        fields = ['id', 'name', 'description', 'cover_image_url', 'items_count']

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        return None

    def get_items_count(self, obj):
        return obj.items.filter(is_deleted=False, is_published=True).count()


class PublicGalleryImageSerializer(serializers.ModelSerializer):
    """Public serializer for images"""
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = GalleryImage
        fields = ['id', 'image_url', 'display_order']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class PublicGalleryItemSerializer(serializers.ModelSerializer):
    """Public serializer for gallery items"""
    images = PublicGalleryImageSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    primary_image_url = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()

    class Meta:
        model = GalleryItem
        fields = [
            'id', 'category', 'category_name', 'title', 'description', 'price',
            'availability_status', 'is_featured', 'images', 'primary_image_url'
        ]

    def get_primary_image_url(self, obj):
        first_image = obj.images.first()
        if first_image and first_image.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        return None

    def get_price(self, obj):
        # Check if prices should be shown based on gallery settings
        show_prices = self.context.get('show_prices', True)
        if show_prices and obj.price:
            return str(obj.price)
        return None


class PublicGallerySerializer(serializers.Serializer):
    """Complete public gallery data"""
    shop_name = serializers.CharField()
    shop_logo = serializers.CharField(allow_null=True)
    whatsapp_number = serializers.CharField(allow_null=True)
    enquiry_message_template = serializers.CharField()
    show_prices = serializers.BooleanField()
    categories = PublicGalleryCategorySerializer(many=True)
    items = PublicGalleryItemSerializer(many=True)

from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'phone', 'email']
    ordering = ['-created_at']

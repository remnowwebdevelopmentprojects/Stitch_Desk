from django.contrib import admin
from .models import User, Quotation, Item, Customer

admin.site.register(User)
admin.site.register(Quotation)
admin.site.register(Item)
admin.site.register(Customer)

# Generated migration to rename table from invoice_user to accounts_user

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelTable(
            name='user',
            table='accounts_user',
        ),
    ]


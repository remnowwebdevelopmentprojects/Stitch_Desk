"""
Management command to fix migration history after splitting apps.
This marks the accounts.0001_initial migration as applied since the table already exists.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Fix migration history after app split - mark accounts.0001_initial as applied'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Check if migration record already exists
            cursor.execute("""
                SELECT COUNT(*) FROM django_migrations 
                WHERE app = 'accounts' AND name = '0001_initial'
            """)
            exists = cursor.fetchone()[0] > 0
            
            if not exists:
                # Insert migration record
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied)
                    VALUES ('accounts', '0001_initial', NOW())
                """)
                self.stdout.write(
                    self.style.SUCCESS('Successfully marked accounts.0001_initial as applied')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('accounts.0001_initial is already marked as applied')
                )


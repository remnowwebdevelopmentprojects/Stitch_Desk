"""
Management command to rename old invoice_* tables to new app table names.
Run this after initial migrations to consolidate tables.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Rename old invoice_* tables to new app table names'

    def handle(self, *args, **options):
        table_mappings = [
            ('invoice_customer', 'customers_customer'),
            ('invoice_quotation', 'invoices_quotation'),
            ('invoice_item', 'invoices_item'),
            ('invoice_measurement', 'measurements_measurement'),
            ('invoice_measurementtemplate', 'measurements_measurementtemplate'),
            ('invoice_order', 'orders_order'),
            ('invoice_orderitem', 'orders_orderitem'),
        ]
        
        with connection.cursor() as cursor:
            for old_table, new_table in table_mappings:
                # Check if old table exists
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '{old_table}'
                    );
                """)
                old_exists = cursor.fetchone()[0]
                
                # Check if new table exists
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '{new_table}'
                    );
                """)
                new_exists = cursor.fetchone()[0]
                
                if old_exists and new_exists:
                    # Both exist - check row counts
                    cursor.execute(f'SELECT COUNT(*) FROM {old_table}')
                    old_count = cursor.fetchone()[0]
                    cursor.execute(f'SELECT COUNT(*) FROM {new_table}')
                    new_count = cursor.fetchone()[0]
                    
                    if old_count > 0 and new_count == 0:
                        # Old table has data, new table is empty - drop new and rename old
                        self.stdout.write(f'Dropping empty {new_table} and renaming {old_table}...')
                        cursor.execute(f'DROP TABLE {new_table} CASCADE;')
                        cursor.execute(f'ALTER TABLE {old_table} RENAME TO {new_table};')
                        self.stdout.write(self.style.SUCCESS(f'✓ Renamed {old_table} -> {new_table}'))
                    elif old_count == 0 and new_count > 0:
                        # New table has data, old is empty - just drop old
                        self.stdout.write(f'Dropping empty {old_table}...')
                        cursor.execute(f'DROP TABLE {old_table} CASCADE;')
                        self.stdout.write(self.style.SUCCESS(f'✓ Dropped {old_table}'))
                    elif old_count == 0 and new_count == 0:
                        # Both empty - drop old, keep new
                        self.stdout.write(f'Both tables empty, dropping {old_table}...')
                        cursor.execute(f'DROP TABLE {old_table} CASCADE;')
                        self.stdout.write(self.style.SUCCESS(f'✓ Dropped {old_table}'))
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'⚠ Both {old_table} and {new_table} have data. '
                                f'Manual intervention needed!'
                            )
                        )
                elif old_exists and not new_exists:
                    # Only old exists - rename it
                    self.stdout.write(f'Renaming {old_table} -> {new_table}...')
                    cursor.execute(f'ALTER TABLE {old_table} RENAME TO {new_table};')
                    self.stdout.write(self.style.SUCCESS(f'✓ Renamed {old_table} -> {new_table}'))
                elif not old_exists and new_exists:
                    # Only new exists - nothing to do
                    self.stdout.write(self.style.SUCCESS(f'✓ {new_table} already exists'))
                else:
                    # Neither exists - nothing to do
                    self.stdout.write(self.style.WARNING(f'⚠ Neither {old_table} nor {new_table} exists'))
            
            # Handle sequences
            sequence_mappings = [
                ('invoice_customer_id_seq', 'customers_customer_id_seq'),
                ('invoice_quotation_id_seq', 'invoices_quotation_id_seq'),
                ('invoice_item_id_seq', 'invoices_item_id_seq'),
            ]
            
            for old_seq, new_seq in sequence_mappings:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.sequences 
                        WHERE sequence_schema = 'public' 
                        AND sequence_name = '{old_seq}'
                    );
                """)
                if cursor.fetchone()[0]:
                    cursor.execute(f'ALTER SEQUENCE {old_seq} RENAME TO {new_seq};')
                    self.stdout.write(self.style.SUCCESS(f'✓ Renamed sequence {old_seq} -> {new_seq}'))
        
        self.stdout.write(self.style.SUCCESS('\n✓ Table renaming complete!'))


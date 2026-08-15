import os
import psycopg2

DB_URL = "postgresql://zeroclaw:zeroclaw_super_secret@localhost:5434/zeroclaw?schema=public"

conn = psycopg2.connect(DB_URL)
conn.autocommit = True
with conn.cursor() as cursor:
    cursor.execute("""
        UPDATE "OnboardingRequest" SET status='approved' WHERE username='test-user-123';
    """)
    print("Approved!")

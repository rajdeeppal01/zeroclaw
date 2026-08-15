FROM python:3.11-alpine

# Add a non-root user
RUN adduser -D -g '' signer

# Install openssl and libpq dependencies
RUN apk add --no-cache openssl postgresql-libs
RUN apk add --no-cache --virtual .build-deps gcc musl-dev postgresql-dev

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Remove build deps
RUN apk --purge del .build-deps

COPY signer.py .

# Give the signer user ownership
RUN chown -R signer:signer /app

# Switch to the non-root user
USER signer

CMD ["python", "-u", "signer.py"]

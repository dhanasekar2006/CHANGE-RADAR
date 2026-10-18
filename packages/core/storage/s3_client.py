from __future__ import annotations

import hashlib
import uuid
from datetime import datetime

import boto3
from botocore.client import Config

from packages.shared.constants import SNAPSHOT_BUCKET_PREFIX


class SnapshotStorage:
    """Thin wrapper around an S3-compatible bucket (AWS S3 or MinIO) for
    snapshot payloads and diff artifacts.

    Both apps/api (serving downloads) and apps/worker (writing new
    snapshots) construct this from the same settings, so bucket/key
    conventions live here once.
    """

    def __init__(
        self,
        *,
        endpoint_url: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        region: str = "us-east-1",
    ) -> None:
        self._bucket = bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=Config(signature_version="s3v4"),
        )

    def ensure_bucket(self) -> None:
        existing = {b["Name"] for b in self._client.list_buckets().get("Buckets", [])}
        if self._bucket not in existing:
            self._client.create_bucket(Bucket=self._bucket)

    @staticmethod
    def build_key(monitor_id: uuid.UUID, content: bytes, *, when: datetime | None = None) -> str:
        when = when or datetime.utcnow()
        date_prefix = when.strftime("%Y/%m/%d")
        digest = hashlib.sha256(content).hexdigest()
        return f"{SNAPSHOT_BUCKET_PREFIX}/{monitor_id}/{date_prefix}/{digest}"

    def put(self, key: str, content: bytes, content_type: str) -> None:
        self._client.put_object(Bucket=self._bucket, Key=key, Body=content, ContentType=content_type)

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)

    def get(self, key: str) -> bytes:
        response = self._client.get_object(Bucket=self._bucket, Key=key)
        return response["Body"].read()

    def presigned_url(self, key: str, expires_in: int = 3600) -> str:
        return self._client.generate_presigned_url(
            "get_object", Params={"Bucket": self._bucket, "Key": key}, ExpiresIn=expires_in
        )

    @staticmethod
    def content_hash(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

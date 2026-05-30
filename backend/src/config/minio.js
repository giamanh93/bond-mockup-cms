const Minio = require('minio')

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'storage',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: false,
  accessKey: process.env.MINIO_USER,
  secretKey: process.env.MINIO_PASS,
})

const BUCKETS = {}

async function ensureBuckets() {
  for (const bucket of Object.values(BUCKETS)) {
    const exists = await minioClient.bucketExists(bucket)
    if (!exists) {
      await minioClient.makeBucket(bucket)
      console.log(`[MinIO] Bucket created: ${bucket}`)
    }
  }
}

module.exports = { minioClient, BUCKETS, ensureBuckets }

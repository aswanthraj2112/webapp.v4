import { randomUUID } from 'crypto';
import { getDb } from '../db.js';

const mapRow = (row) => ({
  id: row.videoUid || String(row.id),
  userId: String(row.userId),
  originalName: row.originalName,
  storedFilename: row.storedFilename,
  format: row.format,
  durationSec: row.durationSec != null ? Number(row.durationSec) : null,
  status: row.status,
  width: row.width != null ? Number(row.width) : null,
  height: row.height != null ? Number(row.height) : null,
  sizeBytes: row.sizeBytes != null ? Number(row.sizeBytes) : null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  thumbPath: row.thumbPath,
  transcodedFilename: row.transcodedFilename
});

const toDbUserId = (userId) => {
  const parsed = Number.parseInt(userId, 10);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid userId for SQLite video repository');
  }
  return parsed;
};

export async function createVideo (video) {
  const db = await getDb();
  const now = video.createdAt || new Date().toISOString();
  const videoUid = video.id || randomUUID();
  await db.run(
    `INSERT INTO videos (
      videoUid, userId, originalName, storedFilename, format, durationSec,
      status, width, height, sizeBytes, createdAt, updatedAt, thumbPath, transcodedFilename
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    videoUid,
    toDbUserId(video.userId),
    video.originalName,
    video.storedFilename,
    video.format,
    video.durationSec,
    video.status || 'uploaded',
    video.width,
    video.height,
    video.sizeBytes,
    now,
    video.updatedAt || now,
    video.thumbPath,
    video.transcodedFilename
  );
  const row = await db.get('SELECT * FROM videos WHERE videoUid = ?', videoUid);
  return row ? mapRow(row) : null;
}

export async function getVideo (userId, videoId) {
  const db = await getDb();
  const row = await db.get(
    'SELECT * FROM videos WHERE userId = ? AND videoUid = ?',
    toDbUserId(userId),
    videoId
  );
  return row ? mapRow(row) : null;
}

export async function listVideos (userId, page = 1, limit = 10) {
  const db = await getDb();
  const numericUserId = toDbUserId(userId);
  const totalRow = await db.get('SELECT COUNT(*) as count FROM videos WHERE userId = ?', numericUserId);
  const total = totalRow ? Number(totalRow.count) : 0;
  const offset = Math.max(0, (page - 1) * limit);
  const rows = await db.all(
    'SELECT * FROM videos WHERE userId = ? ORDER BY datetime(createdAt) DESC LIMIT ? OFFSET ?',
    numericUserId,
    limit,
    offset
  );
  return {
    total,
    items: rows.map(mapRow)
  };
}

export async function updateVideo (userId, videoId, updates = {}) {
  const db = await getDb();
  const updateEntries = Object.entries(updates);
  if (updateEntries.length === 0) {
    return getVideo(userId, videoId);
  }

  if (!('updatedAt' in updates)) {
    updates.updatedAt = new Date().toISOString();
  }

  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  values.push(toDbUserId(userId), videoId);

  await db.run(
    `UPDATE videos SET ${fields.join(', ')} WHERE userId = ? AND videoUid = ?`,
    ...values
  );

  return getVideo(userId, videoId);
}

export async function deleteVideo (userId, videoId) {
  const db = await getDb();
  await db.run('DELETE FROM videos WHERE userId = ? AND videoUid = ?', toDbUserId(userId), videoId);
}

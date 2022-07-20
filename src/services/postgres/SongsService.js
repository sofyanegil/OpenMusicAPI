const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const { mapDBToModelSongs } = require('../../utils');

class SongsService {
  constructor() {
    this._pool = new Pool();
  }

  async addSong({
    title, year, performer, genre, duration, albumId,
  }) {
    const id = `song-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO songs VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      values: [id, title, year, performer, genre, duration, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getSongs({ title, performer }) {
    let query;

    if (title) {
      query = {
        text: 'SELECT * FROM songs WHERE title ILIKE $1',
        values: [`%${title}%`],
      };
    }

    if (performer) {
      query = {
        text: 'SELECT * FROM songs WHERE performer ILIKE $1',
        values: [`%${performer}%`],
      };
    }

    if (title && performer) {
      query = {
        text: 'SELECT * FROM songs WHERE title ILIKE $1 AND performer ILIKE $2',
        values: [`%${title}%`, `%${performer}%`],
      };
    }

    if (!title && !performer) {
      query = {
        text: 'SELECT * FROM songs',
      };
    }

    const result = await this._pool.query(query);

    return result.rows.map(mapDBToModelSongs);
  }

  async getSongById(id) {
    const query = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Lagu tidak ditemukan');
    }

    return result.rows[0];
  }

  async editSongById(id, {
    title, year, performer, genre, duration, albumId,
  }) {
    const query = {
      text: 'UPDATE songs SET title = $1, year = $2, performer = $3, genre = $4, duration = $5, album_id = $6 WHERE id = $7 RETURNING id',
      values: [title, year, performer, genre, duration, albumId, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Gagal memperbarui lagu. Lagu tidak ditemukan');
    }
  }
}

module.exports = SongsService;

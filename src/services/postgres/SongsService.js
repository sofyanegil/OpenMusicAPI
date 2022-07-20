const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
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
}

module.exports = SongsService;

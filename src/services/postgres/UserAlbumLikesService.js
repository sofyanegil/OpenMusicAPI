const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');

class UserAlbumLikes {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addUserAlbumLikes(userId, albumId) {
    const id = `user-album-likes-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO user_album_likes VALUES ($1, $2, $3) RETURNING id',
      values: [id, userId, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Gagal menambahkan likes');
    }

    await this._cacheService.delete(`user_album_likes: ${albumId}`);

    return result.rows[0].id;
  }

  async deleteUserAlbumLikes(userId, albumId) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING id',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Gagal menghapus likes');
    }

    await this._cacheService.delete(`user_album_likes: ${albumId}`);
  }

  async getTotalLikesAlbum(albumId) {
    try {
      const result = await this._cacheService.get(`user_album_likes: ${albumId}`);

      return {
        count: JSON.parse(result).length,
        source: 'cache',
      };
    } catch (error) {
      const query = {
        text: 'SELECT COUNT(*) FROM user_album_likes WHERE album_id = $1',
        values: [albumId],
      };

      const result = await this._pool.query(query);
      const totalCount = result.rows[0].count;

      await this._cacheService.set(`user_album_likes: ${albumId}`, JSON.stringify(totalCount));

      return {
        count: Number(totalCount),
        source: 'database',
      };
    }
  }

  async checkUserAlbumLikes(userId, albumId) {
    const query = {
      text: 'SELECT * FROM user_album_likes WHERE user_id = $1 AND album_id = $2',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    return result.rowCount;
  }
}

module.exports = UserAlbumLikes;

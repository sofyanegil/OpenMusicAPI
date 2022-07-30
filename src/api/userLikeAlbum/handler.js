const ClientError = require('../../exceptions/ClientError');

class UserLikeAlbumHandler {
  constructor(albumsService, userAlbumLikesService) {
    this._albumsService = albumsService;
    this._userAlbumLikesService = userAlbumLikesService;

    this.postUserLikeAlbumHandler = this.postUserLikeAlbumHandler.bind(this);
    this.getUserLikeAlbumCountHandler = this.getUserLikeAlbumCountHandler.bind(this);
  }

  async postUserLikeAlbumHandler(request, h) {
    try {
      const { id: albumId } = request.params;
      const { id: credentialId } = request.auth.credentials;

      await this._albumsService.verifyAlbumExists(albumId);
      const isLiked = await this._userAlbumLikesService.checkUserAlbumLikes(credentialId, albumId);

      if (!isLiked) {
        await this._userAlbumLikesService.addUserAlbumLikes(credentialId, albumId);

        const response = h.response({
          status: 'success',
          message: 'Berhasil menyukai album',
        });
        response.code(201);
        return response;
      }

      await this._userAlbumLikesService.deleteUserAlbumLikes(credentialId, albumId);
      const response = h.response({
        status: 'success',
        message: 'Berhasil menghapus suka album',
      });
      response.code(201);
      return response;
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      const response = h.response({
        status: 'error',
        message: 'Internal server error',
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }

  async getUserLikeAlbumCountHandler(request, h) {
    try {
      const { id: albumId } = request.params;
      const result = await this._userAlbumLikesService.getTotalLikesAlbum(albumId);

      const response = h.response({
        status: 'success',
        data: {
          likes: result.count,
        },
      });
      response.header('X-Data-Source', result.source);
      response.code(200);
      return response;
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      const response = h.response({
        status: 'error',
        message: 'Internal server error',
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }
}
module.exports = UserLikeAlbumHandler;

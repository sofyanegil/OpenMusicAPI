const ClientError = require('../../exceptions/ClientError');

class ExportsHandler {
  constructor(playlistsService, service, validator) {
    this._playlistsService = playlistsService;
    this._service = service;
    this._validator = validator;

    this.postExportPlaylistHandler = this.postExportPlaylistHandler.bind(this);
  }

  async postExportPlaylistHandler(request, h) {
    try {
      this._validator.validateExportPlaylistPayload(request.payload);

      const { playlistId } = request.params;
      const { id: userId } = request.auth.credentials;
      const { targetEmail } = request.payload;

      await this._playlistsService.verifyPlaylistAccess(playlistId, userId);

      const message = {
        playlistId,
        targetEmail,
      };

      await this._service.sendMessage('export:playlist', JSON.stringify(message));

      const response = h.response({
        status: 'success',
        message: 'Permintaan Anda sedang kami proses',
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
}

module.exports = ExportsHandler;

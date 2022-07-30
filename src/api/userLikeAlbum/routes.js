const routes = (handler) => [
  {
    method: 'POST',
    path: '/albums/{id}/likes',
    handler: handler.postUserLikeAlbumHandler,
    options: {
      auth: 'openMusicApi_jwt',
    },
  },
  {
    method: 'GET',
    path: '/albums/{id}/likes',
    handler: handler.getUserLikeAlbumCountHandler,
  },
];

module.exports = routes;

const UserLikeAlbumHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'userAlbumLikes',
  version: '1.0.0',
  register: async (server, { albumsService, userAlbumLikesService }) => {
    const userLikeAlbumHandler = new UserLikeAlbumHandler(albumsService, userAlbumLikesService);
    server.route(routes(userLikeAlbumHandler));
  },
};

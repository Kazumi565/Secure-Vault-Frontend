jest.mock('../client', () => ({
  __esModule: true,
  default: {
    patch: jest.fn(() => Promise.resolve({ profile_picture: '/static/avatar.png' }))
  }
}));

const apiClient = require('../client').default;
const { uploadProfilePicture } = require('../profile');

describe('profile API', () => {
  it('sends profile pictures as multipart form-data', async () => {
    const file = new File(['data'], 'avatar.png', { type: 'image/png' });
    await uploadProfilePicture(file);

    expect(apiClient.patch).toHaveBeenCalled();
    const formData = apiClient.patch.mock.calls[0][1];
    expect(formData instanceof FormData).toBe(true);
  });
});

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    patch: jest.fn(() => Promise.resolve({ profile_picture: '/static/avatar.png' }))
  }
}));

const apiClient = require('../client').default;
const { uploadProfilePicture } = require('../profile');

describe('profile API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends profile pictures as multipart form-data', async () => {
    const file = new File(['data'], 'avatar.png', { type: 'image/png' });
    await uploadProfilePicture(file);

    expect(apiClient.patch).toHaveBeenCalled();
    const formData = apiClient.patch.mock.calls[0][1];
    expect(formData instanceof FormData).toBe(true);
  });

  it('sends multipart request and returns success', async () => {
    const file = new File(['image-data'], 'test-avatar.jpg', { type: 'image/jpeg' });
    
    apiClient.patch.mockResolvedValueOnce({ profile_picture: '/static/avatar.png' });
    const result = await uploadProfilePicture(file);

    expect(apiClient.patch).toHaveBeenCalledWith('/me/profile-picture', expect.any(FormData));
    expect(result).toEqual({ profile_picture: '/static/avatar.png' });
    
    const formData = apiClient.patch.mock.calls[0][1];
    expect(formData instanceof FormData).toBe(true);
  });
});

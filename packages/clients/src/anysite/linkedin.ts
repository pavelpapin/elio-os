/**
 * LinkedIn Functions (via AnySite)
 * 27 tools - profiles, companies, posts, messages, jobs
 */

// Users
export {
  searchUsers,
  getProfile,
  findUserEmail
} from './linkedin-users.js';
export type { SearchUsersOptions, GetProfileOptions } from './linkedin-users.js';

// Companies
export {
  searchCompanies,
  getCompany,
  getCompanyEmployees
} from './linkedin-companies.js';
export type { SearchCompaniesOptions, GetCompanyEmployeesOptions } from './linkedin-companies.js';

// Posts
export {
  searchPosts,
  getPost,
  getUserPosts,
  getCompanyPosts
} from './linkedin-posts.js';
export type { SearchPostsOptions } from './linkedin-posts.js';

// Messaging
export {
  sendMessage,
  getChatMessages
} from './linkedin-messaging.js';
export type { SendMessageOptions } from './linkedin-messaging.js';

// Jobs
export { searchJobs } from './linkedin-jobs.js';
export type { SearchJobsOptions } from './linkedin-jobs.js';

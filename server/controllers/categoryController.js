import { Category, logActivity } from '../models/misc.js';
import Incident from '../models/Incident.js';
import { ApiError, asyncHandler, ok, created } from '../utils/ApiError.js';
import { Validator, clean } from '../utils/validate.js';
import { PRIORITIES } from '../utils/constants.js';

export const ICONS = ['UserX', 'ShieldAlert', 'HeartPulse', 'Wallet', 'Flame', 'CarFront', 'Eye', 'AlertCircle', 'Siren', 'Zap', 'Droplets', 'Bug', 'Bike', 'Building2', 'Lock', 'Phone'];

function readCategory(body, partial = false) {
  const data = {};
  const v = new Validator();
  if (!partial || body.name !== undefined) {
    data.name = clean(body.name, 60);
    v.required('name', data.name, 'Name').length('name', data.name, 2, 60, 'Name');
  }
  if (body.icon !== undefined) { data.icon = clean(body.icon, 30); v.oneOf('icon', data.icon, ICONS, 'Icon'); }
  if (body.color !== undefined) { data.color = clean(body.color, 7); v.match('color', data.color, /^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #2563EB'); }
  if (body.defaultPriority !== undefined) { data.defaultPriority = body.defaultPriority; v.oneOf('defaultPriority', data.defaultPriority, PRIORITIES, 'Priority'); }
  if (body.responseCategory !== undefined) data.responseCategory = clean(body.responseCategory, 80);
  if (body.recommendedAction !== undefined) data.recommendedAction = clean(body.recommendedAction, 300);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  v.assert();
  return data;
}

export const listCategories = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' && req.query.all === 'true' ? {} : { isActive: true };
  const cats = await Category.find(filter).sort({ isSystem: -1, createdAt: 1 }).lean();
  if (req.user.role === 'admin') {
    const counts = await Incident.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]);
    const map = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    cats.forEach((c) => { c.incidentCount = map[c.key] || 0; });
  }
  ok(res, cats);
});

export const createCategory = asyncHandler(async (req, res) => {
  const data = readCategory(req.body);
  data.key = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (await Category.exists({ key: data.key })) throw ApiError.conflict('A category with this name already exists');
  const cat = await Category.create(data);
  await logActivity(req.user, 'Created category', data.name);
  created(res, cat, 'Category created');
});

export const updateCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) throw ApiError.notFound('Category not found');
  Object.assign(cat, readCategory(req.body, true));
  await cat.save();
  await logActivity(req.user, 'Updated category', cat.name);
  ok(res, cat, 'Category updated');
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) throw ApiError.notFound('Category not found');
  if (cat.isSystem) throw ApiError.badRequest('Built-in categories cannot be deleted. Deactivate it instead.');
  if (await Incident.exists({ category: cat.key })) {
    throw ApiError.badRequest('This category is used by existing incidents. Deactivate it instead.');
  }
  await cat.deleteOne();
  await logActivity(req.user, 'Deleted category', cat.name);
  ok(res, { id: cat._id }, 'Category deleted');
});

export const iconList = (_req, res) => ok(res, ICONS);

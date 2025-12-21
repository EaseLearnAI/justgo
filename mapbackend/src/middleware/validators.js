const { validationResult, body, param, query } = require('express-validator');

/**
 * 验证结果处理中间件
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => err.msg);
    return res.status(400).json({
      success: false,
      message: messages[0],
      errors: errors.array()
    });
  }
  
  next();
};

/**
 * 注册验证规则
 */
const registerValidation = [
  body('phone')
    .notEmpty().withMessage('请输入手机号')
    .matches(/^1\d{10}$/).withMessage('请输入正确的手机号'),
  body('password')
    .notEmpty().withMessage('请输入密码')
    .isLength({ min: 6 }).withMessage('密码至少6个字符')
    .isLength({ max: 20 }).withMessage('密码最多20个字符'),
  validate
];

/**
 * 登录验证规则
 */
const loginValidation = [
  body('phone')
    .notEmpty().withMessage('请输入手机号'),
  body('password')
    .notEmpty().withMessage('请输入密码'),
  validate
];

/**
 * 食物记录验证规则
 */
const foodRecordValidation = [
  body('name')
    .notEmpty().withMessage('请输入名称')
    .trim(),
  body('calories')
    .notEmpty().withMessage('请输入热量')
    .isNumeric().withMessage('热量必须是数字')
    .custom(value => value >= 0).withMessage('热量不能为负数'),
  body('type')
    .notEmpty().withMessage('请选择类型')
    .isIn(['intake', 'consume']).withMessage('类型必须是 intake 或 consume'),
  validate
];

/**
 * 运动计划验证规则
 */
const exercisePlanValidation = [
  body('type')
    .notEmpty().withMessage('请选择运动类型')
    .isIn(['walk', 'run', 'bike']).withMessage('运动类型必须是 walk, run 或 bike'),
  body('duration')
    .notEmpty().withMessage('请输入运动时长')
    .isInt({ min: 1 }).withMessage('运动时长至少1分钟'),
  validate
];

/**
 * 日期参数验证
 */
const dateParamValidation = [
  param('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('日期格式必须是 YYYY-MM-DD'),
  validate
];

/**
 * 月份查询参数验证
 */
const monthQueryValidation = [
  query('month')
    .optional()
    .matches(/^\d{4}-\d{2}$/).withMessage('月份格式必须是 YYYY-MM'),
  validate
];

/**
 * 用户资料更新验证
 */
const profileUpdateValidation = [
  body('nickname')
    .optional()
    .isLength({ max: 20 }).withMessage('昵称最多20个字符'),
  body('height')
    .optional()
    .isInt({ min: 50, max: 250 }).withMessage('身高范围应在50-250cm之间'),
  body('weight')
    .optional()
    .isInt({ min: 20, max: 300 }).withMessage('体重范围应在20-300kg之间'),
  body('age')
    .optional()
    .isInt({ min: 1, max: 150 }).withMessage('年龄范围应在1-150之间'),
  body('gender')
    .optional()
    .isIn(['male', 'female']).withMessage('性别必须是 male 或 female'),
  validate
];

/**
 * 目标设置验证
 */
const goalsUpdateValidation = [
  body('dailyCalorieGoal')
    .optional()
    .isInt({ min: 100, max: 10000 }).withMessage('每日热量目标范围应在100-10000kcal之间'),
  body('dailyExerciseGoal')
    .optional()
    .isInt({ min: 1, max: 300 }).withMessage('每日运动时长目标范围应在1-300分钟之间'),
  body('weeklyDaysGoal')
    .optional()
    .isInt({ min: 1, max: 7 }).withMessage('每周运动天数目标范围应在1-7之间'),
  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  foodRecordValidation,
  exercisePlanValidation,
  dateParamValidation,
  monthQueryValidation,
  profileUpdateValidation,
  goalsUpdateValidation
};

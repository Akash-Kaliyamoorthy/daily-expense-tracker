'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Validate (and clean) request input with zod schemas.
 *
 *   router.post('/', validate({ body: createSchema }), handler)
 *   router.get('/:id', validate({ params: idParams, query: listQuery }), handler)
 *
 * On success the parsed (trimmed / coerced / defaulted) values REPLACE
 * req.params / req.query / req.body, so handlers can trust them.
 * On failure it responds 400 with a per-field `errors` list for the forms.
 */
function validate(schemas) {
  return (req, _res, next) => {
    const errors = [];

    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) {
        req[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          errors.push({ in: part, field: issue.path.join('.'), message: issue.message });
        }
      }
    }

    if (errors.length > 0) {
      const first = errors[0];
      const message = first.field ? `${first.field}: ${first.message}` : first.message;
      return next(ApiError.badRequest(message, errors));
    }
    return next();
  };
}

module.exports = validate;

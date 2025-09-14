/**
 * Pagination utility for GraphQL queries
 * @param {Object} options - Pagination options
 * @param {Object} options.model - Mongoose model
 * @param {Object} options.query - Query object
 * @param {Function} options.transform - Transform function for results
 * @param {Array} options.searchableFields - Fields to search in
 * @param {Object} options.fieldTypes - Field types and operators
 * @returns {Object} Paginated result with data, totalCount, hasNextPage, hasPreviousPage
 */
const paginateModel = async ({
  model,
  query = {},
  transform = (doc) => doc,
  searchableFields = [],
  fieldTypes = {},
  limit = 20,
  offset = 0,
  sort = { createdAt: -1 }
}) => {
  try {
    // Build MongoDB query
    let mongoQuery = {};
    
    // Handle search
    if (query.search && searchableFields.length > 0) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      mongoQuery.$or = searchableFields.map(field => ({
        [field]: searchRegex
      }));
    }
    
    // Handle field filters
    Object.keys(query).forEach(key => {
      if (key === 'search' || key === 'limit' || key === 'offset' || key === 'sort') return;
      
      const fieldType = fieldTypes[key];
      if (fieldType) {
        if (fieldType.type === 'number') {
          // Handle number operators
          const operators = fieldType.operators || ['eq'];
          const value = parseFloat(query[key]);
          
          if (!isNaN(value)) {
            if (operators.includes('gte')) {
              mongoQuery[key] = { $gte: value };
            } else if (operators.includes('lte')) {
              mongoQuery[key] = { $lte: value };
            } else if (operators.includes('gt')) {
              mongoQuery[key] = { $gt: value };
            } else if (operators.includes('lt')) {
              mongoQuery[key] = { $lt: value };
            } else {
              mongoQuery[key] = value;
            }
          }
        } else if (fieldType.type === 'string') {
          mongoQuery[key] = { $regex: query[key], $options: 'i' };
        } else {
          mongoQuery[key] = query[key];
        }
      } else {
        mongoQuery[key] = query[key];
      }
    });
    
    // Get total count
    const totalCount = await model.countDocuments(mongoQuery);
    
    // Get paginated data
    const data = await model
      .find(mongoQuery)
      .sort(sort)
      .limit(limit)
      .skip(offset)
      .lean();
    
    // Transform data
    const transformedData = data.map(transform);
    
    // Calculate pagination info
    const hasNextPage = offset + limit < totalCount;
    const hasPreviousPage = offset > 0;
    
    return {
      data: transformedData,
      totalCount,
      hasNextPage,
      hasPreviousPage,
      limit,
      offset
    };
  } catch (error) {
    throw new Error(`Pagination failed: ${error.message}`);
  }
};

module.exports = {
  paginateModel
};

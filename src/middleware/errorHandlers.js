const errorHandler = (err, req, res, next) => {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation Error',
        errors: Object.values(err.errors).map(error => error.message)
      });
    }
  
    if (err.code === 11000) {
      return res.status(400).json({
        message: 'Duplicate field value entered',
        field: Object.keys(err.keyPattern)[0]
      });
    }
  
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token'
      });
    }
  
    console.error('Error:', err);
  
    res.status(err.statusCode || 500).json({
      message: err.message || 'Internal server error'
    });
  };
  
  module.exports = errorHandler;
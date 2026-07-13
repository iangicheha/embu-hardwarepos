export const successResponse = (
  res: any,
  data: any,
  message = "Success",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const errorResponse = (
  res: any,
  message = "Error",
  statusCode = 500
) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};
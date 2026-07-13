declare module "swagger-ui-express" {
  const swaggerUi: {
    serve: any;
    setup: (spec: any) => any;
  };
  export default swaggerUi;
}

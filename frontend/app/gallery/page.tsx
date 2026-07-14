import Image from "next/image";

export default function ProductImageGallery() {
  // Define the images in the order they want to display them
  const productImages = [
    { name: "Bamburi Cement", src: "/Bamburi-Cement.jpg", alt: "Bamburi Cement" },
    { name: "Conduit Pipes", src: "/CONDUIT-PIPES.png", alt: "Conduit Pipes" },
    { name: "Blue Triangle", src: "/blue triangle.jpg", alt: "Blue Triangle" },
    { name: "Electric Wire", src: "/electric wire.jpg", alt: "Electric Wire" },
    { name: "Hammer", src: "/hammer.jpg", alt: "Hammer" },
    { name: "Roofing", src: "/roofing.jpg", alt: "Roofing Material" },
    { name: "Simba Cement", src: "/simbacement.jpg", alt: "Simba Cement" },
    { name: "Steel Pipe", src: "/steelpipe.avif", alt: "Steel Pipe" },
    { name: "Steel Wire", src: "/steelwire.avif", alt: "Steel Wire" },
    { name: "Wall Paint", src: "/wallpaint.jpeg", alt: "Wall Paint" }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Product Images Gallery</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {productImages.map((image, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <Image
              src={image.src}
              alt={image.alt}
              width={400}
              height={300}
              className="object-cover w-full h-48"
            />
            <div className="p-4">
              <h3 className="font-medium text-gray-800">{image.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{image.alt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
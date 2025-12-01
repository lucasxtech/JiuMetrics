// Dashboard de teste simples
export default function DashboardTest() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          TESTE - Bem-vindo!
        </h1>
        <p className="text-gray-600">
          Se você vê isto, React está funcionando!
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-500 text-white p-4 rounded-lg">
          <p>Card 1</p>
        </div>
        <div className="bg-green-500 text-white p-4 rounded-lg">
          <p>Card 2</p>
        </div>
        <div className="bg-red-500 text-white p-4 rounded-lg">
          <p>Card 3</p>
        </div>
      </div>
    </div>
  );
}

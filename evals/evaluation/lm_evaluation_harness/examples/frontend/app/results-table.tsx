interface EvaluationResults {
    headers: string[];
    data: string[];
  }
  
  export default function ResultsTable({ results }: { results: EvaluationResults }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-white">
          <thead className="text-xs uppercase bg-white/20">
            <tr>
              {results.headers.map((header, index) => (
                <th key={index} scope="col" className="px-6 py-3 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white/10">
              {results.data.map((value, index) => (
                <td key={index} className="px-6 py-4 whitespace-nowrap">
                  {value}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    )
  }
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { FileSpreadsheet, BarChart2, Play } from 'lucide-react'

interface EvaluationResults {
  headers: string[];
  data: string[];
}

const models = [
  { name: 'GPT-J', repo: 'EleutherAI/gpt-j-6B' },
  { name: 'LLaMA 3', repo: 'meta-llama/Meta-Llama-3-8B' },
  { name: 'Qwen2', repo: 'Qwen/Qwen2.5-7B' }
]

const datasets = ['Piqa', 'Winogrande']

export default function Home() {
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [batchSize, setBatchSize] = useState('8')
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<EvaluationResults | null>(null)

  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const processOutput = (line: string): string => {
    if (line.startsWith('ERROR:')) {
      return ''
    }
    
    line = line.replace(/OUTPUT: Sequence length:.*/, '')
    line = line.replace(/Executing command:.*/, '')
    line = line.replace(/WARNING.*/, '')
    line = line.replace(/lm-eval.*/, '')
    line = line.replace(/^OUTPUT: /, '')
    
    return line
  }

  const handleEvaluate = useCallback(async () => {
    if (!selectedModel || !selectedDataset || !batchSize) {
      setOutput('Please select a model, dataset, and provide a batch size.')
      return
    }

    setIsLoading(true)
    setOutput('')
    setResults(null)

    const selectedModelRepo = models.find(m => m.name === selectedModel)?.repo

    try {
      const response = await fetch('http://localhost:8000/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: selectedModelRepo, 
          dataset: selectedDataset,
          batchSize: parseInt(batchSize)
        }),
      })

      if (!response.ok) throw new Error('Evaluation failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      let buffer = ''
      let tableLines: string[] = []
      while (true) {
        const { done, value } = await reader?.read() ?? { done: true, value: undefined }
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        let newlineIndex
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex)
          buffer = buffer.slice(newlineIndex + 1)
          
          const processedLine = processOutput(line)
          if (processedLine) {
            setOutput(prev => prev + processedLine + '\n')
          }

          if (line.startsWith('|')) {
            tableLines.push(line)
          }

          if (tableLines.length === 3) {
            const [headers, _, data] = tableLines
            setResults({
              headers: headers.split('|').filter(Boolean).map(h => h.trim()),
              data: data.split('|').filter(Boolean).map(d => d.trim())
            })
            break
          }
        }
      }
      
      if (buffer) {
        const processedBuffer = processOutput(buffer)
        if (processedBuffer) {
          setOutput(prev => prev + processedBuffer)
        }
      }

    } catch (error: unknown) {
      if (error instanceof Error) {
        setOutput(prev => prev + `\nError: ${error.message}`)
      } else {
        setOutput(prev => prev + `\nAn unknown error occurred`)
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedModel, selectedDataset, batchSize])

  const handleCsvClick = () => {
    window.open('http://localhost:8000/tasks.html', '_blank')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0071c5] to-[#00a1f1] text-white p-8">
      <div className="max-w-4xl mx-auto bg-[#f5f5f5] rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8 relative">
          <button
            onClick={handleCsvClick}
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Open CSV"
          >
            <FileSpreadsheet size={24} />
          </button>
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 flex items-center justify-center">
            <BarChart2 className="mr-2" size={32} />
            Model Evaluator
          </h1>
          <div className="space-y-6">
            <div className="flex flex-col space-y-2">
              <label htmlFor="model-select" className="text-sm font-medium text-gray-700">Select a model</label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a model</option>
                {models.map(model => (
                  <option key={model.name} value={model.name}>{model.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="dataset-select" className="text-sm font-medium text-gray-700">Select a dataset</label>
              <select
                id="dataset-select"
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a dataset</option>
                {datasets.map(dataset => (
                  <option key={dataset} value={dataset}>{dataset}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="batch-size" className="text-sm font-medium text-gray-700">Batch Size</label>
              <input
                id="batch-size"
                type="number"
                placeholder="Batch Size"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <button 
                onClick={handleEvaluate} 
                disabled={isLoading} 
                className="w-full p-3 bg-[#0071c5] text-white rounded-lg font-medium hover:bg-[#005fa3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Evaluating
                  </span>
                ) : (
                  <>
                    <Play className="mr-2" size={20} />
                    Evaluate
                  </>
                )}
              </button>
            </div>

            {results && (
              <div className="mt-6 p-4 bg-white rounded-lg border border-gray-300">
                <h2 className="text-xl font-semibold mb-2 text-gray-800">Evaluation Results</h2>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      {results.headers.map((header, index) => (
                        <th key={index} className="p-2 border-b border-gray-300 text-gray-700">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {results.data.map((value, index) => (
                        <td key={index} className="p-2 border-b border-gray-300 text-gray-700">{value}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div 
              ref={outputRef}
              className="mt-6 p-4 bg-white rounded-lg h-[200px] overflow-y-auto font-mono text-sm text-gray-700 border border-gray-300"
            >
              <pre className="whitespace-pre-wrap">
                {output}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
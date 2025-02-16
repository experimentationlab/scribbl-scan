import { useState } from 'react'
import EventsList from './components/EventsList'
import TasksList from './components/TasksList'
import './App.css'
import { type Log, type Address } from 'viem'

interface Task extends Log {
  args: {
    machineHash: `0x${string}`;
    input: `0x${string}`;
    callback: Address;
  };
}

interface InputDetails {
  hash: string;
  blockNumber: string;
}

function App() {
  const [selectedPayloadHash, setSelectedPayloadHash] = useState<string | null>(null);
  const [inputDetails, setInputDetails] = useState<InputDetails | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);

  const handleTaskClick = (payloadHash: string, inputTx: string, blockNumber: string) => {
    setSelectedPayloadHash(payloadHash);
    setInputDetails({ hash: inputTx, blockNumber });
  };

  return (
    <div className="app">
      <h1>Scribbl Scan</h1>
      {selectedPayloadHash ? (
        <div className="output-view">
          <button className="back-button" onClick={() => setSelectedPayloadHash(null)}>
            ← Back to Inputs
          </button>
          <h2>Output for Input #{selectedPayloadHash.slice(0, 8)}...</h2>
          <EventsList payloadHash={selectedPayloadHash} inputDetails={inputDetails} />
        </div>
      ) : (
        <div className="input-view">
          <TasksList 
            onTaskClick={handleTaskClick}
            userAddress={userAddress}
            setUserAddress={setUserAddress}
            tasks={tasks}
            setTasks={setTasks}
          />
        </div>
      )}
    </div>
  )
}

export default App

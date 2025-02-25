import { useState } from 'react';
import { createPublicClient, http, Address, type Log, hexToString, keccak256 } from 'viem';
import { holesky } from 'viem/chains';
import './TasksList.css';

interface Task extends Log {
  args: {
    machineHash: `0x${string}`;
    input: `0x${string}`;
    callback: Address;
  };
}

const contractAbi = [
  {
    "type": "event",
    "name": "TaskIssued",
    "inputs": [
      {
        "name": "machineHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "input",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      },
      {
        "name": "callback",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  }
] as const;

interface TasksListProps {
  onTaskClick: (payloadHash: string, inputTx: string, blockNumber: string) => void;
  userAddress: string;
  setUserAddress: (address: string) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
}

export default function TasksList({ 
  onTaskClick, 
  userAddress, 
  setUserAddress,
  tasks,
  setTasks 
}: TasksListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = createPublicClient({
    chain: holesky,
    transport: http()
  });

  const BLOCK_RANGE = 50000n; // Maximum allowed block range

  async function fetchTasksInRange(fromBlock: bigint, toBlock: bigint) {
    return await client.getContractEvents({
      address: "0xff35E413F5e22A9e1Cc02F92dcb78a5076c1aaf3",
      abi: contractAbi,
      eventName: 'TaskIssued',
      args: { callback: "0x844E494489BEFC2baA9c6d168a659264a7779505" as Address },
      fromBlock,
      toBlock
    });
  }

  // Fetch all tasks with pagination
  const fetchAllTasks = async () => {
    const latestBlock = await client.getBlockNumber();
    let currentFromBlock = 3358671n;
    const allTasks = [];

    while (currentFromBlock <= latestBlock) {
      const currentToBlock = BigInt(Math.min(
        Number(currentFromBlock + BLOCK_RANGE),
        Number(latestBlock)
      ));
      
      const batchTasks = await fetchTasksInRange(currentFromBlock, currentToBlock);
      allTasks.push(...batchTasks);
      
      if (currentToBlock === latestBlock) break;
      currentFromBlock = currentToBlock + 1n;
    }

    return allTasks;
  };

  const decodeImageFromHex = (inputHex: string) => {
    try {
      const jsonString = hexToString(inputHex as `0x${string}`);
      const jsonData = JSON.parse(jsonString);
      const base64String = jsonData.image;
      
      return (
        <div className="image-container">
          <img 
            src={`data:image/png;base64,${base64String}`}
            alt="User submission" 
            className="submission-thumbnail"
            onError={(e) => {
              console.error('Image loading error');
              e.currentTarget.style.display = 'none';
            }}
          />
          <p className="theme-text">{jsonData.theme}</p>
        </div>
      );
    } catch (err) {
      console.error('Error decoding image:', err);
      return 'Unable to decode image data';
    }
  };

  const fetchTasks = async () => {
    if (!userAddress) {
      setError('Please enter a valid address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formattedAddress = userAddress.toLowerCase();
      const fetchedTasks = await fetchAllTasks();

      // Get transaction details for each task and filter by signer
      const userTasks = await Promise.all(
        fetchedTasks.map(async task => {
          const tx = await client.getTransaction({ hash: task.transactionHash });
          return { task, from: tx.from };
        })
      );

      const filteredTasks = userTasks
        .filter(({ from }) => from.toLowerCase() === formattedAddress)
        .map(({ task }) => task);

      setTasks(filteredTasks as Task[]);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const computePayloadHash = (input: string) => {
    return keccak256(input as `0x${string}`);
  };

  return (
    <div className="tasks-container">
      <div className="input-container">
        <input
          type="text"
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
          placeholder="Enter user address (0x...)"
        />
        <button
          onClick={fetchTasks}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Fetch Doodles'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {tasks.length > 0 ? (
        <div className="tasks-list">
          {tasks.map((task, index) => {
            const payloadHash = computePayloadHash(task.args.input);
            console.log('Task:', {
              hash: task.transactionHash,
              blockNumber: task.blockNumber,
              args: task.args
            });
            return (
              <div  
                key={`${task.transactionHash}-${index}`} 
                className="task-card clickable"
                onClick={() => onTaskClick(
                  payloadHash, 
                  task.transactionHash!,
                  task.blockNumber!.toString(10)
                )}
              >
                <div className="image-content">
                  {decodeImageFromHex(task.args.input)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !isLoading && <p className="no-tasks">No tasks found</p>
      )}
    </div>
  );
} 
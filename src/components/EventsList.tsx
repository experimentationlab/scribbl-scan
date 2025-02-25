import { useState, useEffect } from 'react';
import { createPublicClient, http, Address, type Log, decodeAbiParameters } from 'viem';
import { holesky } from 'viem/chains';
import './EventsList.css';

interface Event extends Log {
  args: {
    payloadHash: `0x${string}`;
    user: Address;
    notice: `0x${string}`;  // notice is bytes, not string
  };
}

const contractAbi = [
  {
    "type": "event",
    "name": "NoticeReceived",
    "inputs": [
      {
        "name": "payloadHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "notice",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  }
] as const;

interface EventsListProps {
  payloadHash: string;
  inputDetails: { hash: string; blockNumber: string } | null;
}

const BLOCK_RANGE = 50000n; // Maximum allowed block range

async function fetchEventsInRange(fromBlock: bigint, toBlock: bigint, payloadHash: `0x${string}`) {
  const client = createPublicClient({
    chain: holesky,
    transport: http()
  });
  return await client.getContractEvents({
    address: "0x844E494489BEFC2baA9c6d168a659264a7779505",
    abi: contractAbi,
    eventName: 'NoticeReceived',
    args: { payloadHash },
    fromBlock,
    toBlock
  });
}

// Fetch all events with pagination
const fetchAllEvents = async (payloadHash: `0x${string}`) => {
  const client = createPublicClient({
    chain: holesky,
    transport: http()
  });
  const latestBlock = await client.getBlockNumber();
  let currentFromBlock = 3358559n;
  const allEvents = [];

  while (currentFromBlock <= latestBlock) {
    const currentToBlock = BigInt(Math.min(
      Number(currentFromBlock + BLOCK_RANGE),
      Number(latestBlock)
    ));
    
    const batchEvents = await fetchEventsInRange(currentFromBlock, currentToBlock, payloadHash);
    allEvents.push(...batchEvents);
    
    if (currentToBlock === latestBlock) break;
    currentFromBlock = currentToBlock + 1n;
  }

  return allEvents;
};

export default function EventsList({ payloadHash, inputDetails }: EventsListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedEvents = await fetchAllEvents(payloadHash as `0x${string}`);
      console.log('Fetched events:', fetchedEvents);
      setEvents(fetchedEvents as Event[]);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [payloadHash]);

  const decodeNotice = (noticeHex: string) => {
    try {
      const [result, theme, classes, probabilities] = decodeAbiParameters(
        [
          { name: 'result', type: 'uint256' },
          { name: 'theme', type: 'string' },
          { name: 'classes', type: 'string[]' },
          { name: 'probabilities', type: 'uint256[]' }
        ],
        noticeHex as `0x${string}`
      );

      return (
        <div>
          <p><strong>Result:</strong> {result.toString()} %</p>
          <p><strong>Theme:</strong> {theme}</p>
          <p><strong>Classes:</strong></p>
          <ul>
            {classes.map((className, index) => (
              <li key={index}>
                {className}: {Number(probabilities[index]).toFixed(1)}%
              </li>
            ))}
          </ul>
        </div>
      );
    } catch (err) {
      console.error('Error decoding notice:', err);
      return 'Unable to decode notice';
    }
  };

  return (
    <div className="events-container">
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {events.length > 0 ? (
        <div className="events-list">
          {events.map((event, index) => (
            <div key={`${event.transactionHash}-${index}`} className="event-card">
              <div className="notice-content">
                {decodeNotice(event.args.notice)}
              </div>
              <div className="event-metadata">
                <h3>Transaction Details</h3>
                <p className="metadata"><strong>Payload Hash:</strong> {event.args.payloadHash}</p>
                <p className="metadata"><strong>Input Tx Hash:</strong> {inputDetails?.hash}</p>
                <p className="metadata"><strong>Input Block Number:</strong> {inputDetails?.blockNumber}</p>
                <p className="metadata"><strong>Callback Tx Hash:</strong> {event.transactionHash}</p>
                <p className="metadata"><strong>Callback Block Number:</strong> {event.blockNumber?.toString()}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isLoading && <p className="no-events">No events found</p>
      )}
    </div>
  );
} 
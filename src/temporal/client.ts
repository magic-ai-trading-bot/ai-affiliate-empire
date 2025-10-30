import { Connection, Client } from '@temporalio/client';
import { ConfigService } from '@nestjs/config';

let temporalClient: Client | null = null;

export async function getTemporalClient(config?: ConfigService): Promise<Client> {
  if (temporalClient) {
    return temporalClient;
  }

  const address = config?.get('TEMPORAL_ADDRESS') || process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = config?.get('TEMPORAL_NAMESPACE') || process.env.TEMPORAL_NAMESPACE || 'default';

  console.log(`🔗 Connecting to Temporal at ${address} (namespace: ${namespace})`);

  try {
    const connection = await Connection.connect({ address });

    temporalClient = new Client({
      connection,
      namespace,
    });

    console.log('✅ Temporal client connected');

    return temporalClient;
  } catch (error) {
    console.error('❌ Failed to connect to Temporal:', error);
    throw error;
  }
}

export async function closeTemporalClient(): Promise<void> {
  if (temporalClient) {
    await temporalClient.connection.close();
    temporalClient = null;
    console.log('✅ Temporal client disconnected');
  }
}

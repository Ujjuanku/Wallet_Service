
const axios = require('axios');

const BASE_URL = 'http://localhost:8080';
const USER_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22'; // Alice
const ASSET_ID = 'GOLD';

async function getBalance() {
    const res = await axios.get(`${BASE_URL}/wallet/${USER_ID}/balance`);
    return res.data.balances.GOLD;
}

async function runConcurrencyTest() {
    console.log('Starting Balance:', await getBalance());

    const requests = [];
    const NUM_REQUESTS = 10;
    const AMOUNT = 5;

    console.log(`Firing ${NUM_REQUESTS} spend requests of ${AMOUNT} GOLD simultaneously...`);

    for (let i = 0; i < NUM_REQUESTS; i++) {
        requests.push(
            axios.post(`${BASE_URL}/wallet/spend`, {
                userId: USER_ID,
                amount: AMOUNT,
                assetId: ASSET_ID,
                idempotencyKey: `conc-test-${Date.now()}-${i}`
            }).catch(e => ({ status: e.response?.status, data: e.response?.data }))
        );
    }

    const results = await Promise.all(requests);

    const successes = results.filter(r => r.status === 200 || r.status === 201).length;
    const failures = results.filter(r => r.status !== 200 && r.status !== 201).length;

    console.log(`Successes: ${successes}`);
    console.log(`Failures: ${failures}`);
    console.log('Final Balance:', await getBalance());
}

runConcurrencyTest();

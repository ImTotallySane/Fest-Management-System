require('dotenv').config();

const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${process.env.PORT || 6767}/api`;

const results = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (method, path, body, token, expectedStatus) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (typeof expectedStatus === 'number' && response.status !== expectedStatus) {
        const err = new Error(`Expected ${expectedStatus}, got ${response.status} for ${method} ${path}`);
        err.response = { status: response.status, data };
        throw err;
    }

    return { status: response.status, data, headers: response.headers };
};

const test = async (name, fn) => {
    const started = Date.now();
    try {
        await fn();
        results.push({ name, ok: true, ms: Date.now() - started });
    } catch (error) {
        results.push({
            name,
            ok: false,
            ms: Date.now() - started,
            error: error?.message || 'Unknown error',
            detail: error?.response ? JSON.stringify(error.response.data) : undefined
        });
    }
};

(async () => {
    const runId = Date.now();
    const organizerEmail = `organizer_${runId}@iiit.ac.in`;
    const organizerPassword = 'Org@12345';
    const participantEmail = `participant_${runId}@mail.com`;
    const participantPassword = 'Part@12345';
    const approvedNewPassword = 'Org@New12345';

    const state = {
        adminToken: '',
        organizerToken: '',
        participantToken: '',
        organizerId: '',
        normalEventId: '',
        merchEventId: '',
        resetRequestId: ''
    };

    await test('Health check /auth/login endpoint reachable', async () => {
        const res = await request('POST', '/auth/login', { email: 'invalid@example.com', password: 'bad' });
        if (![400, 403].includes(res.status)) {
            throw new Error('API reachable but unexpected status check failed');
        }
    });

    await test('Admin login', async () => {
        const res = await request('POST', '/auth/login', {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        }, null, 200);
        if (!res.data?.token || res.data?.role !== 'admin') {
            throw new Error('Admin login token/role validation failed');
        }
        state.adminToken = res.data.token;
    });

    await test('Admin add organizer', async () => {
        await request('POST', '/auth/add-organizer', {
            organizerName: `Organizer ${runId}`,
            email: organizerEmail,
            password: organizerPassword,
            category: 'Technical',
            contactNumber: '9999999999',
            description: 'E2E organizer'
        }, state.adminToken, 201);
    });

    await test('Organizer login', async () => {
        const res = await request('POST', '/auth/login', {
            email: organizerEmail,
            password: organizerPassword
        }, null, 200);
        if (res.data?.role !== 'organizer') {
            throw new Error('Expected organizer role');
        }
        state.organizerToken = res.data.token;
    });

    await test('Register participant', async () => {
        const res = await request('POST', '/auth/register', {
            firstName: 'Part',
            lastName: `User${runId}`,
            email: participantEmail,
            password: participantPassword,
            participantType: 'Non-IIIT',

            collegeName: 'Test College',
            interests: ['coding', 'music']
        }, null, 200);
        if (res.data?.role !== 'participant') {
            throw new Error('Expected participant role');
        }
        state.participantToken = res.data.token;
    });

    await test('Participant profile read + update', async () => {
        const profile = await request('GET', '/users/profile', null, state.participantToken, 200);
        if (profile.data?.email !== participantEmail) {
            throw new Error('Profile email mismatch');
        }

        await request('PUT', '/users/profile', {
            firstName: 'UpdatedPart',
            lastName: 'UpdatedLast',
            contactNumber: '8888888888',
            collegeName: 'Updated College',
            interests: ['updated']
        }, state.participantToken, 200);
    });

    await test('Organizer profile read + update', async () => {
        const profile = await request('GET', '/users/profile', null, state.organizerToken, 200);
        state.organizerId = profile.data?._id;
        if (!state.organizerId) {
            throw new Error('Organizer id missing');
        }

        await request('PUT', '/users/profile', {
            organizerName: `Organizer ${runId} Updated`,
            category: 'Technical',
            description: 'Updated organizer profile',
            contactNumber: '7777777777',
            contactEmail: organizerEmail
        }, state.organizerToken, 200);
    });

    await test('Organizer create normal event', async () => {
        const now = Date.now();
        const res = await request('POST', '/events', {
            eventName: `Normal Event ${runId}`,
            eventDescription: 'Normal event for e2e',
            eventType: 'normal',
            eligibility: 'All',
            registrationDeadline: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
            eventStartDate: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
            eventEndDate: new Date(now + 72 * 60 * 60 * 1000).toISOString(),
            registrationLimit: 50,
            registrationFee: 100,
            eventTags: ['test', 'normal'],
            status: 'published',
            customFormFields: [{ label: 'Roll Number', type: 'text', required: true }]
        }, state.organizerToken, 201);

        state.normalEventId = res.data?.event?._id;
        if (!state.normalEventId) throw new Error('Normal event id missing');
    });

    await test('Organizer create merchandise event', async () => {
        const now = Date.now();
        const res = await request('POST', '/events', {
            eventName: `Merch Event ${runId}`,
            eventDescription: 'Merch event for e2e',
            eventType: 'merchandise',
            eligibility: 'All',
            registrationDeadline: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
            eventStartDate: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
            eventEndDate: new Date(now + 72 * 60 * 60 * 1000).toISOString(),
            registrationLimit: 50,
            registrationFee: 250,
            eventTags: ['test', 'merch'],
            status: 'published',
            customFormFields: [{ label: 'Address', type: 'text', required: true }],
            merchandiseDetails: {
                variants: [{ variantLabel: 'Tshirt-M-Black', size: 'M', color: 'Black', stock: 5 }],
                purchaseLimitPerParticipant: 2
            }
        }, state.organizerToken, 201);

        state.merchEventId = res.data?.event?._id;
        if (!state.merchEventId) throw new Error('Merch event id missing');
    });

    await test('Participant browse events', async () => {
        const res = await request('GET', '/events/browse', null, state.participantToken, 200);
        const ids = (res.data?.events || []).map((e) => String(e._id));
        if (!ids.includes(String(state.normalEventId)) || !ids.includes(String(state.merchEventId))) {
            throw new Error('Created events not visible in browse list');
        }
    });

    await test('Participant follow organizer + organizer detail', async () => {
        await request('POST', `/users/organizers/${state.organizerId}/follow`, {}, state.participantToken, 200);
        const detail = await request('GET', `/users/organizers/${state.organizerId}`, null, state.participantToken, 200);
        if (!detail.data?.organizer?._id) {
            throw new Error('Organizer detail missing');
        }
    });

    await test('Participant register normal event', async () => {
        await request('POST', `/events/${state.normalEventId}/register`, {
            formAnswers: { rollNo: 'R123' }
        }, state.participantToken, 201);
    });

    await test('Duplicate registration blocked', async () => {
        const res = await request('POST', `/events/${state.normalEventId}/register`, {
            formAnswers: { rollNo: 'R123' }
        }, state.participantToken);

        if (res.status !== 400) {
            throw new Error(`Expected 400 on duplicate registration, got ${res.status}`);
        }
    });

    await test('Participant purchase merchandise event', async () => {
        await request('POST', `/events/${state.merchEventId}/register`, {
            quantity: 1,
            variantLabel: 'Tshirt-M-Black',
            formAnswers: { address: 'Test Address' }
        }, state.participantToken, 201);
    });

    await test('Organizer dashboard list + event detail + status update', async () => {
        const list = await request('GET', '/events/organizer/my-events/all', null, state.organizerToken, 200);
        if (!Array.isArray(list.data?.events) || list.data.events.length < 2) {
            throw new Error('Organizer events list missing expected items');
        }

        const detail = await request('GET', `/events/organizer/${state.normalEventId}/detail`, null, state.organizerToken, 200);
        if (!Array.isArray(detail.data?.participants) || detail.data.participants.length < 1) {
            throw new Error('Participants missing in organizer detail');
        }

        await request('PATCH', `/events/organizer/${state.normalEventId}/status`, { status: 'ongoing' }, state.organizerToken, 200);
    });

    await test('Organizer participants CSV export', async () => {
        const headers = { Authorization: `Bearer ${state.organizerToken}` };
        const response = await fetch(`${BASE_URL}/events/organizer/${state.normalEventId}/participants.csv`, { headers });
        const text = await response.text();
        if (response.status !== 200 || !text.includes('Name,Email,RegDate,Payment,TicketId')) {
            throw new Error('CSV export failed or invalid format');
        }
    });

    await test('Organizer submit password reset request', async () => {
        await request('POST', '/users/password-reset-request', {
            reason: 'Forgot password in e2e run'
        }, state.organizerToken, 201);
    });

    await test('Admin approve reset request', async () => {
        const requests = await request('GET', '/admin/password-reset-requests', null, state.adminToken, 200);
        const pending = (requests.data || []).find((item) => item.organizerId?.email === organizerEmail && item.status === 'pending');
        if (!pending?._id) {
            throw new Error('Pending reset request not found');
        }
        state.resetRequestId = pending._id;

        await request('PATCH', `/admin/password-reset-requests/${state.resetRequestId}`, {
            action: 'approve',
            newPassword: approvedNewPassword,
            adminComment: 'Approved in e2e'
        }, state.adminToken, 200);
    });

    await test('Organizer can login with approved new password', async () => {
        await sleep(300);
        const res = await request('POST', '/auth/login', {
            email: organizerEmail,
            password: approvedNewPassword
        }, null, 200);
        if (res.data?.role !== 'organizer') {
            throw new Error('Organizer login with new password failed role check');
        }
        state.organizerToken = res.data.token;
    });

    await test('Admin disable organizer blocks login', async () => {
        await request('PATCH', `/admin/organizers/${state.organizerId}/disable`, {}, state.adminToken, 200);
        const blocked = await request('POST', '/auth/login', {
            email: organizerEmail,
            password: approvedNewPassword
        });
        if (blocked.status !== 403) {
            throw new Error(`Expected 403 for disabled organizer login, got ${blocked.status}`);
        }
    });

    await test('Participant unfollow organizer', async () => {
        await request('DELETE', `/users/organizers/${state.organizerId}/follow`, null, state.participantToken, 200);
    });

    const passed = results.filter((item) => item.ok).length;
    const failed = results.length - passed;

    console.log('\n================ E2E API CHECK REPORT ================');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('------------------------------------------------------');

    results.forEach((item, index) => {
        const status = item.ok ? 'PASS' : 'FAIL';
        console.log(`${String(index + 1).padStart(2, '0')}. [${status}] ${item.name} (${item.ms}ms)`);
        if (!item.ok) {
            console.log(`    -> ${item.error}`);
            if (item.detail) console.log(`    -> detail: ${item.detail}`);
        }
    });

    console.log('======================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
})();

// Sketch data. The conversation is the recorded run mt-03-data-in-singapore, run 1, from the final Phase 1 eval run
// eval/results/2026-10-31T08-01-35-p1-full (asks, say lines, labels, why text, zones and turn times verbatim).
// Product names, purposes and notes come from packages/core/catalog (2026-10-31). Card positions are hand-placed in
// world units (cards 192 x 64, gaps 24 x 20) to show the layout-v2 target in spec section 11; the app uses layoutGraph().
window.SKETCH = {
  catalogDate: '2026-10-31',
  products: {
    users: { name: 'Users', short: 'Users', category: 'External', purpose: 'People reaching the system over the internet from browsers or apps.' },
    dns: { name: 'Alibaba Cloud DNS', short: 'Cloud DNS', category: 'Domain Names and Websites', purpose: 'Authoritative public DNS for your domains; a resolve hop, not on the data path.' },
    ga: { name: 'Global Accelerator (GA)', short: 'Global Accelerator', category: 'Networking & CDN', purpose: 'Anycast entry points carrying traffic over the Alibaba backbone to regional endpoints.' },
    esa: { name: 'Edge Security Acceleration (ESA)', short: 'ESA', category: 'Networking & CDN', purpose: 'Global edge: caching, dynamic acceleration, WAF, DDoS defense, bot management and edge functions.', note: 'Includes its own WAF and DDoS protection; add standalone WAF only for deeper rule sets.' },
    alb: { name: 'Application Load Balancer (ALB)', short: 'ALB', category: 'Networking & CDN', purpose: 'Layer-7 HTTP/HTTPS/gRPC load balancer with content routing; also serves as ACK Ingress.' },
    waf: { name: 'Web Application Firewall (WAF)', short: 'WAF', category: 'Security', purpose: 'WAF 3.0: blocks OWASP attacks, CC floods and bots via cloud-native or CNAME access.' },
    'certificate-management': { name: 'Certificate Management Service', short: 'Certificates', category: 'Security', purpose: 'Buy, issue and deploy SSL/TLS certificates, including a private CA.' },
    ecs: { name: 'Elastic Compute Service (ECS)', short: 'ECS', category: 'Computing', purpose: 'Virtual machines (x86, Arm, GPU) with cloud disks and security groups.' },
    ess: { name: 'Auto Scaling (ESS)', short: 'Auto Scaling', category: 'Computing', purpose: 'Scales ECS or ECI fleets by rules, schedules or metrics and registers them to load balancers.' },
    tair: { name: 'Tair (Redis® OSS-Compatible)', short: 'Tair (Redis)', category: 'Database', purpose: 'Managed Redis-compatible in-memory database and cache, plus Tair enterprise features.', note: 'Formerly ApsaraDB for Redis (merged into the Tair brand on 2024-09-27).' },
    rds: { name: 'ApsaraDB RDS', short: 'RDS', category: 'Database', purpose: 'Managed MySQL, PostgreSQL, SQL Server and MariaDB with HA, read replicas and backups.' },
    oss: { name: 'Object Storage Service (OSS)', short: 'OSS', category: 'Storage', purpose: 'Durable object storage for files, media, backups and data lakes; S3-compatible.' },
    kms: { name: 'Key Management Service (KMS)', short: 'KMS', category: 'Security', purpose: 'Managed encryption keys with rotation and BYOK, plus Secrets Manager.' },
    sls: { name: 'Simple Log Service (SLS)', short: 'SLS', category: 'Storage', purpose: 'Collects, searches, analyzes with SQL and alerts on logs, metrics and traces.' },
    'cloud-backup': { name: 'Cloud Backup', short: 'Cloud Backup', category: 'Storage', purpose: 'Backup and disaster recovery for ECS, databases, NAS, OSS and VMware.' },
    nat: { name: 'NAT Gateway', short: 'NAT Gateway', category: 'Networking & CDN', purpose: 'Gives private VPC resources outbound internet (SNAT) and mapped inbound ports (DNAT).' },
    'cloud-firewall': { name: 'Cloud Firewall', short: 'Cloud Firewall', category: 'Security', purpose: 'Internet, VPC and NAT border firewalls with intrusion prevention and access control.' },
    milvus: { name: 'Vector Retrieval Service for Milvus', short: 'Milvus', category: 'Analytics Computing', purpose: 'Managed vector database compatible with open-source Milvus, for RAG and multimodal search.' },
    'model-studio': { name: 'Alibaba Cloud Model Studio', short: 'Model Studio', category: 'AI & Machine Learning', purpose: 'Managed model APIs for Qwen (such as qwen3.8-max) and third-party models; OpenAI-compatible.' },
  },

  // rev: the revision that added the node. host: drawn as a badge on that card. where: the frame, for popover and panel.
  nodes: [
    { id: 'dns', product: 'dns', label: 'Cloud DNS', why: 'Resolves the portal domain to ESA.', rev: 1, x: 12, y: 32, where: 'Global' },
    { id: 'users', product: 'users', label: 'Fintech customers', why: 'Customers accessing the portal over the internet.', rev: 1, x: 12, y: 160, where: 'Internet' },
    { id: 'ga', product: 'ga', label: 'Global Accelerator', why: 'Accelerates European user traffic to Singapore over the backbone.', rev: 4, x: 12, y: 288, where: 'Edge network' },
    { id: 'esa', product: 'esa', label: 'ESA', why: 'Accelerates portal traffic and provides DDoS defense.', rev: 1, x: 12, y: 372, where: 'Edge network' },
    { id: 'firewall', product: 'cloud-firewall', label: 'Cloud Firewall', why: 'Inspects north-south traffic into the VPC.', rev: 1, x: 264, y: 64, where: 'Portal VPC' },
    { id: 'nat', product: 'nat', label: 'NAT Gateway', why: 'Outbound internet for patches without public IPs.', rev: 1, x: 480, y: 64, where: 'Portal VPC' },
    { id: 'alb', product: 'alb', label: 'ALB', why: 'Routes HTTPS traffic across two zones.', rev: 1, x: 264, y: 148, zones: ['A', 'B'], where: 'Portal VPC' },
    { id: 'waf', product: 'waf', label: 'WAF 3.0', why: 'Blocks OWASP attacks on the customer portal.', rev: 1, host: 'alb', where: 'Portal VPC' },
    { id: 'cert', product: 'certificate-management', label: 'TLS certificate', why: 'Terminates TLS at the load balancer.', rev: 1, host: 'alb', where: 'Portal VPC' },
    { id: 'cache', product: 'tair', label: 'Session cache', why: 'Stores sessions and tokens in memory.', rev: 1, x: 480, y: 148, zones: ['A', 'B'], where: 'Portal VPC' },
    { id: 'app', product: 'ecs', label: 'Portal servers', why: 'Runs the web app in two zones for HA.', rev: 1, x: 264, y: 232, zones: ['A', 'B'], where: 'Portal VPC' },
    { id: 'scaling', product: 'ess', label: 'Auto Scaling', why: 'Adds instances during peak login times.', rev: 1, host: 'app', where: 'Portal VPC' },
    { id: 'db', product: 'rds', label: 'Customer DB', why: 'Primary relational store for customer data.', rev: 1, x: 480, y: 232, zones: ['A', 'B'], where: 'Portal VPC' },
    { id: 'chatbot', product: 'ecs', label: 'Chatbot service', why: 'Runs the chatbot backend that orchestrates RAG queries within Singapore.', rev: 3, x: 264, y: 316, zones: ['A', 'B'], where: 'Portal VPC' },
    { id: 'db-replica', product: 'rds', label: 'DR read replica', why: 'Cross-zone read replica for disaster recovery within Singapore.', rev: 2, x: 480, y: 316, zones: ['B'], where: 'Portal VPC' },
    { id: 'vector-db', product: 'milvus', label: 'Vector store', why: 'Stores document embeddings for RAG retrieval, data stays in Singapore.', rev: 3, x: 480, y: 400, zones: ['A', 'B'], where: 'Portal VPC' },
    { id: 'backup', product: 'cloud-backup', label: 'Cloud Backup', why: 'Backs up ECS, RDS and OSS for disaster recovery in Singapore.', rev: 2, x: 708, y: 52, where: 'Singapore' },
    { id: 'docs', product: 'oss', label: 'Customer docs', why: 'Encrypted bucket for KYC documents.', rev: 1, x: 708, y: 136, where: 'Singapore' },
    { id: 'kms', product: 'kms', label: 'KMS', why: 'Encrypts database and storage keys at rest.', rev: 1, x: 708, y: 240, where: 'Singapore' },
    { id: 'logs', product: 'sls', label: 'Audit logs', why: 'Centralised audit trail for compliance.', rev: 1, x: 708, y: 344, where: 'Singapore' },
    { id: 'llm', product: 'model-studio', label: 'Model Studio (Qwen)', why: 'Provides Qwen LLM inference for generating chatbot answers.', rev: 3, x: 708, y: 448, where: 'Singapore' },
  ],

  card: { w: 192, h: 64 },
  world: { w: 912, h: 524 },
  frames: [
    { id: 'global', label: 'Global', kind: 'edge', x: 0, y: 0, w: 216, h: 108 },
    { id: 'internet', label: 'Internet', kind: 'ext', x: 0, y: 128, w: 216, h: 108 },
    { id: 'edge', label: 'Edge network', kind: 'edge', x: 0, y: 256, w: 216, h: 192 },
    { id: 'sg', label: 'Singapore', sub: 'ap-southeast-1', kind: 'region', x: 240, y: 0, w: 672, h: 524 },
    { id: 'vpc', label: 'Portal VPC', pre: 'VPC', kind: 'vpc', x: 252, y: 32, w: 432, h: 444 },
  ],
  lanes: [
    { label: 'Storage', x: 708, y: 32 },
    { label: 'Security', x: 708, y: 220 },
    { label: 'Operations', x: 708, y: 324 },
    { label: 'AI', x: 708, y: 428, rev: 3 },
  ],

  // Drawn edges. path: on the request path. rev: the revision that added it. gone: the revision that removed it.
  // lab: the label's centre; labLeft: lab is the label's left edge (a label beside a vertical line).
  // A label is omitted where no segment holds it clear of cards; the products panel lists every connection.
  // Control edges (keys, logs, backup, NAT, firewall) stay hidden until an end is hovered (spec 7.21).
  edges: [
    { id: 'e-users-dns', kind: 'resolve', rev: 1, pts: [[108, 160], [108, 96]] },
    { id: 'e-users-ga', label: 'anycast', path: true, rev: 4, pts: [[108, 224], [108, 288]], lab: [114, 256], labLeft: true },
    { id: 'e-ga-esa', label: 'backbone', path: true, rev: 4, pts: [[108, 352], [108, 372]], lab: [114, 362], labLeft: true },
    { id: 'e-users-esa', label: 'HTTPS', path: true, rev: 1, gone: 4, pts: [[108, 224], [108, 372]], lab: [114, 300], labLeft: true },
    { id: 'e-esa-alb', label: 'origin', path: true, rev: 1, pts: [[204, 404], [228, 404], [228, 180], [264, 180]], lab: [228, 340] },
    { id: 'e-alb-app', label: 'HTTP', path: true, rev: 1, pts: [[420, 212], [420, 232]] },
    { id: 'e-app-cache', label: 'Redis', rev: 1, pts: [[456, 248], [468, 248], [468, 180], [480, 180]] },
    { id: 'e-app-db', label: 'SQL', path: true, rev: 1, pts: [[456, 272], [480, 272]] },
    { id: 'e-db-db-replica', label: 'replication', kind: 'async', rev: 2, pts: [[576, 296], [576, 316]] },
    { id: 'e-app-docs', label: 'objects', rev: 1, pts: [[456, 288], [470, 288], [470, 306], [690, 306], [690, 152], [708, 152]], lab: [520, 306] },
    { id: 'e-app-chatbot', label: 'chat API', rev: 3, pts: [[360, 296], [360, 316]] },
    { id: 'e-chatbot-vector', label: 'search', rev: 3, pts: [[456, 348], [468, 348], [468, 432], [480, 432]], lab: [468, 390] },
    { id: 'e-chatbot-llm', label: 'LLM API', rev: 3, waits: 'llm', pts: [[360, 380], [360, 492], [700, 492], [700, 480], [708, 480]], lab: [530, 492] },
    { id: 'e-docs-vector', label: 'embeddings', kind: 'async', rev: 3, waits: 'docs-vector', pts: [[708, 188], [702, 188], [702, 432], [672, 432]] },
  ],

  requirement: { text: 'Customer data must stay in Singapore', region: 'Singapore (ap-southeast-1)' },

  revisions: [
    {
      n: 1, ask: "We're a Singapore fintech and customer data must stay in Singapore. Design a web app with a database for our customer portal.",
      says: ["I'll design a two-zone fintech customer portal in Singapore with ESA, ALB, WAF, ECS, Tair and RDS."],
      changes: [
        ['+', 'Users', 'Fintech customers'], ['+', 'Cloud DNS'], ['+', 'ESA'], ['+', 'ALB', '', 'zones A, B'], ['+', 'WAF', 'WAF 3.0', 'on ALB'],
        ['+', 'Certificates', 'TLS certificate', 'on ALB'], ['+', 'ECS', 'Portal servers', 'zones A, B'], ['+', 'Auto Scaling', '', 'on Portal servers'],
        ['+', 'Tair (Redis)', 'Session cache', 'zones A, B'], ['+', 'RDS', 'Customer DB', 'zones A, B'], ['+', 'KMS'], ['+', 'NAT Gateway'],
        ['+', 'Cloud Firewall'], ['+', 'SLS', 'Audit logs'], ['+', 'OSS', 'Customer docs'],
      ],
      connections: '+ 12 connections', added: 15, removed: 0, seconds: '23.0',
    },
    {
      n: 2, ask: 'Add disaster recovery.',
      says: ["I'll add a cross-zone RDS read replica and Cloud Backup for disaster recovery, all within Singapore."],
      changes: [['+', 'RDS', 'DR read replica', 'zone B', 'db-replica'], ['+', 'Cloud Backup', '', '', 'backup']],
      connections: '4 connections', added: 2, removed: 0, seconds: '9.5',
    },
    {
      n: 3, ask: 'Add an AI chatbot that answers customer questions.',
      says: ["I'll add an AI chatbot using Model Studio for LLM inference and Milvus as a vector store for RAG over your docs."],
      changes: [['+', 'ECS', 'Chatbot service', 'zones A, B', 'chatbot'], ['+', 'Milvus', 'Vector store', 'zones A, B', 'vector-db'], ['+', 'Model Studio', 'Model Studio (Qwen)', '', 'llm']],
      connections: '5 connections', added: 3, removed: 0, seconds: '7.3',
    },
    {
      n: 4, ask: 'Our users in Europe say the portal is slow. What can we do?',
      says: ["I'll add Global Accelerator to route European users over Alibaba's backbone to Singapore, keeping all data in-region."],
      changes: [['+', 'Global Accelerator', '', 'Edge network', 'ga'], ['+', '2 connections', '', 'Fintech customers to GA to ESA'], ['-', '1 connection removed', '', 'Fintech customers to ESA']],
      added: 1, removed: 0, seconds: '4.5',
    },
  ],
};

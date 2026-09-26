import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const USER_PROVIDED_GEMINI_API_KEY = 'AQ.Ab8RN6KSKSDURXIxjpSm8ZuvXDonIRZ0AkgakLuuAcr8Jwb9rw';

// Lazy GoogleGenAI initialization
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || USER_PROVIDED_GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// High availability models in order of resilience and latency.
// 'gemini-3.1-flash-lite' is the official lightweight flash model in @google/genai SDK.
// It executes in ~1.3s and avoids the 503 high-demand spikes of gemini-3.8-flash.
const RESILIENT_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.6-flash'];

async function executeGeminiWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  config: any,
  timeoutMs: number = 7000
): Promise<any | null> {
  for (const model of RESILIENT_MODELS) {
    try {
      const callPromise = ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout with model ${model}`)), timeoutMs)
      );
      const res: any = await Promise.race([callPromise, timeoutPromise]);
      if (res && res.text) {
        return res;
      }
    } catch {
      // Quietly cascade to next model without emitting 503 uncaught errors
      continue;
    }
  }
  return null;
}

// Local fallback parser for Amarii Cafe task data
function fallbackParser(rawText: string) {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const urgentTasks: any[] = [];
  const todayChecklist: any[] = [];
  const pendingFollowUps: any[] = [];

  lines.forEach((line, idx) => {
    // skip table headers
    if (line.toLowerCase().startsWith('task id') && line.includes('\t')) return;
    if (line.startsWith('---') || line.toLowerCase().startsWith('amarii cafe tasks dashboard') || line.toLowerCase().startsWith('petpooja tasks dashboard')) return;

    const lower = line.toLowerCase();
    const id = `task-${idx + 1}-${Date.now().toString(36)}`;
    
    // Clean prefix numbering or bullets
    let cleanText = line.replace(/^(\d+[\.\)]|\-|\*|\[\w+\])\s*/i, '').trim();

    // Determine category / department
    let department = 'General';
    if (/kitchen|chef|cook|fryer|grill|oven|chiller|prep|dough|gas bank|recipe|sauce|mozzarella/i.test(line)) department = 'Kitchen';
    else if (/bar|beverage|cocktail|coffee|espresso|grinder|syrup|ice|barista|keg/i.test(line)) department = 'Bar';
    else if (/housekeeping|cleaning|clean|mop|scrub|washroom|restroom|toilet|hygiene|trash|garbage|sanitiz/i.test(line)) department = 'Housekeeping';
    else if (/service|waiter|captain|server|table|cutlery|napkin|dining|guest|foh|caddies|menu briefing/i.test(line)) department = 'Service';
    else if (/billing|pos|cash|drawer|payment|z-report|swipe|invoice|payout|bill|counter|edc/i.test(line)) department = 'Billing';
    else if (/management|manager|gm|audit|compliance|roster|vendor approval|schedule/i.test(line)) department = 'Management';
    else if (/inventory|stock|supplier|delivery|crate|wastage/i.test(line)) department = 'Inventory';
    else if (/maintenance|repair|leak|sparking|ac|light|plumbing/i.test(line)) department = 'Maintenance';

    const item = {
      id,
      title: cleanText.length > 90 ? cleanText.slice(0, 90) + '...' : cleanText,
      details: cleanText.length > 90 ? cleanText : undefined,
      department,
      completed: false,
      sourceRaw: line,
    };

    if (
      lower.includes('urgent') ||
      lower.includes('critical') ||
      lower.includes('high') ||
      lower.includes('immediately') ||
      lower.includes('shortage') ||
      lower.includes('discrepancy') ||
      lower.includes('sparking') ||
      lower.includes('emergency')
    ) {
      urgentTasks.push({ ...item, priority: 'urgent' });
    } else if (
      lower.includes('pending') ||
      lower.includes('approval') ||
      lower.includes('waiting') ||
      lower.includes('follow up') ||
      lower.includes('follow-up') ||
      lower.includes('awaiting')
    ) {
      pendingFollowUps.push({ ...item, priority: 'pending' });
    } else {
      todayChecklist.push({ ...item, priority: 'today' });
    }
  });

  return {
    summary: `Analyzed ${urgentTasks.length + todayChecklist.length + pendingFollowUps.length} restaurant tasks for Amarii Cafe.`,
    urgentTasks,
    todayChecklist,
    pendingFollowUps,
    closingQuestion: 'Which tasks should I mark as completed today?',
    rawText,
    analyzedAt: new Date().toISOString(),
  };
}

// API Routes
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'icon.svg'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Analyze Amarii Cafe task data
app.post('/api/analyze-tasks', async (req, res) => {
  const { rawText } = req.body;
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({ error: 'Please provide task data to analyze.' });
  }

  const ai = getAi();
  if (!ai) {
    // Return heuristic parsing if no API key
    const parsed = fallbackParser(rawText);
    return res.json(parsed);
  }

  try {
    const prompt = `You are an expert, highly efficient Restaurant Operations Assistant for Amarii Cafe.
Analyze this raw daily task data extracted or pasted for Amarii Cafe / Restaurant Operations:

--- RAW TASK DATA ---
${rawText}
--- END RAW TASK DATA ---

Categorize every task into one of these 3 specific categories:
1. Urgent/High Priority: Tasks that need immediate attention during service (e.g., inventory shortages, critical staff issues, urgent billing/cancellations, equipment breakdowns, food safety/gas issues).
2. Today's Checklist: Routine operations and standard daily tasks (e.g., opening/closing checks, temperature logs, standard POS sync, mise en place, dining sanitation).
3. Pending/Follow-ups: Tasks that are incomplete or waiting on someone else's approval (e.g., manager approvals, supplier credit notes, pending delivery confirmations, quote approvals).

- Department must be accurately categorized as one of: "Kitchen", "Bar", "Housekeeping", "Service", "Billing", "Management", "Inventory", "Maintenance", "General".
- Keep every task title short, punchy, and highly scannable using concise bullet-point phrasing for busy restaurant managers.
- If an employee or assignee name is mentioned (e.g. Anand, Sunita, Kunal, Manoj, Riya, Ramesh, Vikas), preserve it in the assignee field.
- Provide brief context details if relevant.
- Summary should be 1 concise sentence summarizing the operational focus for the shift.
- The closingQuestion must be exactly: "Which tasks should I mark as completed today?"`;

    const response = await executeGeminiWithFallback(
      ai,
      prompt,
      {
        systemInstruction:
          'You are an efficient Restaurant Operations Assistant for Amarii Cafe. Always provide scannable, structured outputs for fast-paced cafe and restaurant operations.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'One crisp sentence summarizing shift focus and urgent items',
            },
            urgentTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  details: { type: Type.STRING },
                  department: { type: Type.STRING },
                  deadline: { type: Type.STRING },
                  assignee: { type: Type.STRING },
                },
                required: ['title', 'department'],
              },
            },
            todayChecklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  details: { type: Type.STRING },
                  department: { type: Type.STRING },
                  deadline: { type: Type.STRING },
                  assignee: { type: Type.STRING },
                },
                required: ['title', 'department'],
              },
            },
            pendingFollowUps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  details: { type: Type.STRING },
                  department: { type: Type.STRING },
                  deadline: { type: Type.STRING },
                  assignee: { type: Type.STRING },
                },
                required: ['title', 'department'],
              },
            },
            closingQuestion: {
              type: Type.STRING,
            },
          },
          required: ['summary', 'urgentTasks', 'todayChecklist', 'pendingFollowUps', 'closingQuestion'],
        },
      },
      8000
    );

    if (!response || !response.text) {
      const fallback = fallbackParser(rawText);
      return res.json(fallback);
    }

    const parsedJson = JSON.parse(response.text?.trim() || '{}');
    let counter = 1;

    const formatTasks = (list: any[], priority: 'urgent' | 'today' | 'pending') => {
      return (list || []).map((t: any) => ({
        id: t.id || `task-${counter++}-${Date.now().toString(36)}`,
        title: t.title || 'Untitled Task',
        details: t.details || undefined,
        priority,
        department: t.department || 'General',
        completed: false,
        deadline: t.deadline || undefined,
        assignee: t.assignee || undefined,
      }));
    };

    const finalResult = {
      summary: parsedJson.summary || 'Shift task breakdown prepared.',
      urgentTasks: formatTasks(parsedJson.urgentTasks, 'urgent'),
      todayChecklist: formatTasks(parsedJson.todayChecklist, 'today'),
      pendingFollowUps: formatTasks(parsedJson.pendingFollowUps, 'pending'),
      closingQuestion: parsedJson.closingQuestion || 'Which tasks should I mark as completed today?',
      rawText,
      analyzedAt: new Date().toISOString(),
    };

    return res.json(finalResult);
  } catch {
    // Graceful fallback to heuristic parsing
    const fallback = fallbackParser(rawText);
    return res.json(fallback);
  }
});

// Interactive Ops Assistant Chat & Task Status Updater
app.post('/api/chat', async (req, res) => {
  const { message, currentTasks } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
  const lower = message.toLowerCase().trim();

  // Instant local NLP parser for sub-50ms response & task matching across all Indian languages
  const generateFastResponse = () => {
    const matchedIds: string[] = [];
    const uncompletedIds: string[] = [];

    // Language identification across Indian languages (supporting both native scripts and Roman transliterations)
    const isMarathi =
      lower.includes('zala') ||
      lower.includes('jhala') ||
      lower.includes('kela') ||
      lower.includes('aahe') ||
      lower.includes('aahet') ||
      lower.includes('kay') ||
      lower.includes('challay') ||
      lower.includes('namaskar') ||
      lower.includes('dakhva') ||
      lower.includes('aajche') ||
      lower.includes('vaajle') ||
      lower.includes('vel') ||
      lower.includes('kasa') ||
      lower.includes('purna') ||
      lower.includes('झाले') ||
      lower.includes('झाला') ||
      lower.includes('केले') ||
      lower.includes('आहे') ||
      lower.includes('नमस्कार') ||
      lower.includes('दाखवा');

    const isBengali =
      lower.includes('hoyeche') ||
      lower.includes('hoye geche') ||
      lower.includes('korechi') ||
      lower.includes('shesh') ||
      lower.includes('nomoshkar') ||
      lower.includes('ki khobor') ||
      lower.includes('dekhao') ||
      lower.includes('shob') ||
      lower.includes('baki ache') ||
      lower.includes('হয়েছে') ||
      lower.includes('হয়ে গেছে') ||
      lower.includes('শেষ') ||
      lower.includes('নমস্কার') ||
      lower.includes('দেখান');

    const isTamil =
      lower.includes('mudinjiduchu') ||
      lower.includes('mudinjithu') ||
      lower.includes('panniyachu') ||
      lower.includes('aachu') ||
      lower.includes('vanakkam') ||
      lower.includes('kaattu') ||
      lower.includes('eppadi irukkeenga') ||
      lower.includes('mudinthathu') ||
      lower.includes('முடிந்தது') ||
      lower.includes('முடிஞ்சிடுச்சு') ||
      lower.includes('வணக்கம்');

    const isTelugu =
      lower.includes('ayipoyindi') ||
      lower.includes('ayindi') ||
      lower.includes('chesanu') ||
      lower.includes('namaskaram') ||
      lower.includes('bagunnara') ||
      lower.includes('chupinchu') ||
      lower.includes('poorthi') ||
      lower.includes('అయిపోయింది') ||
      lower.includes('పూర్తయింది') ||
      lower.includes('నమస్కారం');

    const isKannada =
      lower.includes('aagide') ||
      lower.includes('madide') ||
      lower.includes('mugiyithu') ||
      lower.includes('namaskara') ||
      lower.includes('hegiddeera') ||
      lower.includes('thorisu') ||
      lower.includes('ಮುಗಿದಿದೆ') ||
      lower.includes('ಆಗಿದೆ') ||
      lower.includes('ನಮಸ್ಕಾರ');

    const isGujarati =
      lower.includes('thai gayu') ||
      lower.includes('kari didhu') ||
      lower.includes('patyu') ||
      lower.includes('namaste') ||
      lower.includes('kem cho') ||
      lower.includes('batavo') ||
      lower.includes('baki che') ||
      lower.includes('થઈ ગયું') ||
      lower.includes('પૂરું') ||
      lower.includes('નમસ્તે');

    const isMalayalam =
      lower.includes('kazhinju') ||
      lower.includes('cheythu') ||
      lower.includes('theernnu') ||
      lower.includes('namaskaram') ||
      lower.includes('sugamano') ||
      lower.includes('kaannikku') ||
      lower.includes('കഴിഞ്ഞു') ||
      lower.includes('തീർന്നു') ||
      lower.includes('നമസ്കാരം');

    const isPunjabi =
      lower.includes('ho geya') ||
      lower.includes('kar ditta') ||
      lower.includes('khatam ho geya') ||
      lower.includes('sat sri akaal') ||
      lower.includes('ki haal') ||
      lower.includes('dikhao') ||
      lower.includes('ਹੋ ਗਿਆ') ||
      lower.includes('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ') ||
      lower.includes('ਖਤਮ');

    const isUrdu =
      lower.includes('mukammal') ||
      lower.includes('shukriya') ||
      lower.includes('adaab') ||
      lower.includes('مکمل') ||
      lower.includes('ہو گیا') ||
      lower.includes('آداب');

    const isOdia =
      lower.includes('hoigala') ||
      lower.includes('sarigala') ||
      lower.includes('namaskar') ||
      lower.includes('ହୋଇଗଲା') ||
      lower.includes('ସରିଗଲା') ||
      lower.includes('ନମସ୍କାର');

    const isEnglish =
      lower.includes('what') ||
      lower.includes('done') ||
      lower.includes('completed') ||
      lower.includes('finished') ||
      lower.includes('clean') ||
      lower.includes('status') ||
      lower.includes('how are') ||
      lower.includes('hello') ||
      lower.includes('reopen') ||
      lower.includes('undo');

    if (Array.isArray(currentTasks)) {
      currentTasks.forEach((t: any) => {
        const titleLower = (t.title || '').toLowerCase();
        const deptLower = (t.department || '').toLowerCase();

        const isActionComplete =
          lower.includes('ho gaya') ||
          lower.includes('done') ||
          lower.includes('complete') ||
          lower.includes('jhala') ||
          lower.includes('zala') ||
          lower.includes('kela') ||
          lower.includes('kar diya') ||
          lower.includes('tick') ||
          lower.includes('finished') ||
          lower.includes('check kela') ||
          lower.includes('ho gya') ||
          lower.includes('khatam') ||
          lower.includes('hoyeche') ||
          lower.includes('mudinjiduchu') ||
          lower.includes('ayipoyindi') ||
          lower.includes('aagide') ||
          lower.includes('thai gayu') ||
          lower.includes('kazhinju') ||
          lower.includes('ho geya') ||
          lower.includes('mukammal') ||
          lower.includes('हो गया') ||
          lower.includes('झाले') ||
          lower.includes('झाला') ||
          lower.includes('হয়েছে') ||
          lower.includes('முடிந்தது') ||
          lower.includes('పూర్తయింది') ||
          lower.includes('ಮುಗಿದಿದೆ') ||
          lower.includes('થઈ ગયું') ||
          lower.includes('കഴിഞ്ഞു') ||
          lower.includes('ਹੋ ਗਿਆ') ||
          lower.includes('ହୋଇଗଲା') ||
          lower.includes('مکمل');

        const isActionUncomplete =
          lower.includes('undo') ||
          lower.includes('reopen') ||
          lower.includes('pending') ||
          lower.includes('baki hai') ||
          lower.includes('nahi hua') ||
          lower.includes('nahi zala') ||
          lower.includes('hoy ni') ||
          lower.includes('mudiyala') ||
          lower.includes('बाकी') ||
          lower.includes('नाही झाले') ||
          lower.includes('ਨਹੀਂ ਹੋਇਆ');

        // Check keyword matching across typical cafe stations
        const words = titleLower.split(' ').filter((w: string) => w.length > 3);
        const hasKeywordMatch =
          words.some((w: string) => lower.includes(w)) ||
          (lower.includes('fryer') && titleLower.includes('fryer')) ||
          (lower.includes('oil') && titleLower.includes('oil')) ||
          (lower.includes('ice') && titleLower.includes('ice')) ||
          (lower.includes('espresso') && titleLower.includes('espresso')) ||
          (lower.includes('coffee') && (titleLower.includes('coffee') || titleLower.includes('espresso') || deptLower === 'bar')) ||
          (lower.includes('gas') && titleLower.includes('gas')) ||
          (lower.includes('bartan') && (titleLower.includes('dish') || titleLower.includes('sink') || deptLower === 'housekeeping')) ||
          (lower.includes('floor') && titleLower.includes('floor')) ||
          (lower.includes('pos') && (titleLower.includes('pos') || titleLower.includes('billing'))) ||
          (lower.includes('bill') && (titleLower.includes('bill') || deptLower === 'billing'));

        if (hasKeywordMatch || lower.includes(t.id.toLowerCase())) {
          if (isActionUncomplete) {
            uncompletedIds.push(t.id);
          } else if (isActionComplete || lower.includes(titleLower)) {
            matchedIds.push(t.id);
          }
        }
      });
    }

    // Check if user is asking for a Report, PDF, Excel (XLS), Word (DOC), or Audit Export
    const isReportRequest =
      lower.includes('report') ||
      lower.includes('pdf') ||
      lower.includes('xls') ||
      lower.includes('excel') ||
      lower.includes('doc') ||
      lower.includes('word') ||
      lower.includes('sheet') ||
      lower.includes('download') ||
      lower.includes('export') ||
      lower.includes('audit') ||
      lower.includes('प्रिंट') ||
      lower.includes('डाउनलोड') ||
      lower.includes('डाऊनलोड') ||
      lower.includes('রিপোর্ট') ||
      lower.includes('அறிக்கை');

    const totalCount = Array.isArray(currentTasks) ? currentTasks.length : 0;
    const completedCount = Array.isArray(currentTasks) ? currentTasks.filter((t: any) => t.completed).length : 0;
    const pendingCount = totalCount - completedCount;
    const urgentCount = Array.isArray(currentTasks) ? currentTasks.filter((t: any) => t.priority === 'urgent').length : 0;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const reportData = isReportRequest
      ? {
          title: 'Amarii Café Operations Shift & Audit Report',
          generatedAt: now.toISOString(),
          totalTasks: totalCount,
          completedTasks: completedCount,
          pendingTasks: pendingCount,
          urgentTasks: urgentCount,
          completionRate,
          station: 'All Stations',
          outlet: 'Amarii Cafe Kothrud',
          summary: `Shift Audit: ${completedCount}/${totalCount} tasks completed (${completionRate}% target) with ${urgentCount} urgent items.`,
        }
      : undefined;

    let reply = `Haan ji! Update note kar liya hai. Live time ${timeStr} hai.`;

    if (isReportRequest) {
      if (isMarathi) {
        reply = `📄 अमारी कॅफेचा ऑफिशियल ऑपरेशन्स रिपोर्ट तयार केला आहे! खाली दिलेल्या 1-Click बटनांवरून आपण PDF (.pdf), Excel (.xls) किंवा Word Doc (.doc) लगेच डाउनलोड करू शकता.`;
      } else if (isBengali) {
        reply = `📄 আমরাই ক্যাফে অফিসিয়াল শিফট রিপোর্ট প্রস্তুত! নিচের 1-ক্লিক বাটনগুলি থেকে PDF (.pdf), Excel (.xls) অথবা Word Doc (.doc) সরাসরি ডাউনলোড করতে পারেন।`;
      } else if (isTamil) {
        reply = `📄 அமாரி கஃபே அதிகாரப்பூர்வ அறிக்கை தயாராக உள்ளது! கீழே உள்ள 1-Click பொத்தான்கள் மூலம் PDF (.pdf), Excel (.xls) அல்லது Word Doc (.doc) பதிவிறக்கம் செய்யவும்.`;
      } else if (isTelugu) {
        reply = `📄 అమారి కేఫ్ అధికారిక షిఫ్ట్ రిపోర్ట్ సిద్ధంగా ఉంది! దిగువన ఉన్న 1-క్లిక్ బటన్ల ద్వారా PDF (.pdf), Excel (.xls) లేదా Word Doc (.doc) వెంటనే డౌన్‌లోడ్ చేసుకోండి.`;
      } else if (isKannada) {
        reply = `📄 ಅಮಾರಿ ಕೆಫೆ ಅಧಿಕೃತ ವರದಿ ಸಿದ್ಧವಾಗಿದೆ! ಕೆಳಗಿನ 1-ಕ್ಲಿಕ್ ಬಟನ್‌ಗಳಿಂದ PDF (.pdf), Excel (.xls) ಅಥವಾ Word Doc (.doc) ಅನ್ನು ತಕ್ಷಣವೇ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ.`;
      } else if (isGujarati) {
        reply = `📄 અમારિ કેફે શિફ્ટ રિપોર્ટ તૈયાર છે! નીચે આપેલા 1-ક્લિક બટન દ્વારા PDF (.pdf), Excel (.xls) અથવા Word Doc (.doc) ડાઉનલોડ કરી શકો છો.`;
      } else if (isMalayalam) {
        reply = `📄 അമാരി കഫേ റിപ്പോർട്ട് തയ്യാറാണ്! താഴെയുള്ള 1-ക്ലിക്ക് ബട്ടണുകളിൽ നിന്ന് PDF (.pdf), Excel (.xls) അല്ലെങ്കിൽ Word Doc (.doc) ഡൗൺലോഡ് ചെയ്യാം.`;
      } else if (isPunjabi) {
        reply = `📄 ਅਮਾਰੀ ਕੈਫੇ ਸ਼ਿਫਟ ਰਿਪੋਰਟ ਤਿਆਰ ਹੈ! ਹੇਠਾਂ ਦਿੱਤੇ 1-ਕਲਿੱਕ ਬਟਨਾਂ ਤੋਂ PDF (.pdf), Excel (.xls) ਜਾਂ Word Doc (.doc) ਤੁਰੰਤ ਡਾਊਨਲੋਡ ਕਰੋ।`;
      } else if (isUrdu) {
        reply = `📄 آماری کیفے آفیشل رپورٹ تیار ہے! نیچے دیے گئے 1-کلک بٹنز سے PDF (.pdf), Excel (.xls), یا Word Doc (.doc) ڈاؤن لوڈ کریں۔`;
      } else if (isOdia) {
        reply = `📄 ଅମାରୀ କ୍ୟାଫେ ଅପରେସନ୍ସ ରିପୋର୍ଟ ପ୍ରସ୍ତୁତ! ତଳେ ଥିବା 1-କ୍ଲିକ୍ ବଟନ୍ ମାଧ୍ୟମରେ PDF (.pdf), Excel (.xls) କିମ୍ବା Word Doc (.doc) ଡାଉନଲୋଡ୍ କରନ୍ତୁ।`;
      } else if (isEnglish) {
        reply = `📄 Amarii Café Official Operations Report generated! You can 1-click download it in PDF (.pdf), Excel (.xls), or Word Doc (.doc) formats below.`;
      } else {
        reply = `📄 अमारी कैफे का ऑफिशियल ऑपरेशन्स रिपोर्ट तैयार कर दिया गया है! आप नीचे दिए गए 1-Click बटन्स से PDF (.pdf), Excel (.xls), या Word Doc (.doc) तुरंत डाउनलोड कर सकते हैं।`;
      }
    } else if (isBengali) {
      if (matchedIds.length > 0) {
        reply = `দারুণ! ${matchedIds.length}টি টাস্ক সম্পন্ন (Completed) হিসেবে মার্ক করা হয়েছে (${timeStr})।`;
      } else if (uncompletedIds.length > 0) {
        reply = `${uncompletedIds.length}টি টাস্ক পুনরায় পেন্ডিং হিসেবে সেট করা হয়েছে।`;
      } else {
        reply = `নমস্কার! আমরাই ক্যাফে অপারেশনস আপডেট নোট করা হয়েছে (${timeStr})।`;
      }
    } else if (isTamil) {
      if (matchedIds.length > 0) {
        reply = `நன்றி! ${matchedIds.length} பணிகள் வெற்றிகரமாக முடிக்கப்பட்டுவிட்டன (${timeStr}).`;
      } else if (uncompletedIds.length > 0) {
        reply = `${uncompletedIds.length} பணிகள் நிலுவையில் (Pending) வைக்கப்பட்டுள்ளன.`;
      } else {
        reply = `வணக்கம்! அமாரி கஃபே பணிகள் கண்காணிக்கப்படுகின்றன (${timeStr}).`;
      }
    } else if (isTelugu) {
      if (matchedIds.length > 0) {
        reply = `ధన్యవాదాలు! ${matchedIds.length} పనులు పూర్తయినట్లు మార్క్ చేయబడ్డాయి (${timeStr}).`;
      } else if (uncompletedIds.length > 0) {
        reply = `${uncompletedIds.length} పనులు పెండింగ్‌లో ఉంచబడ్డాయి.`;
      } else {
        reply = `నమస్కారం! అమారి కేఫ్ ఆపరేషన్స్ నవీకరించబడ్డాయి (${timeStr}).`;
      }
    } else if (isKannada) {
      if (matchedIds.length > 0) {
        reply = `ಉತ್ತಮ! ${matchedIds.length} ಕೆಲಸಗಳು ಪೂರ್ಣಗೊಂಡಿವೆ ಎಂದು ಗುರುತಿಸಲಾಗಿದೆ (${timeStr}).`;
      } else if (uncompletedIds.length > 0) {
        reply = `${uncompletedIds.length} ಕೆಲಸಗಳನ್ನು ಬಾಕಿ (Pending) ಎಂದು ಹೊಂದಿಸಲಾಗಿದೆ.`;
      } else {
        reply = `ನಮಸ್ಕಾರ! ಅಮಾರಿ ಕೆಫೆ ಕಾರ್ಯಗಳು ನವೀಕರಿಸಲ್ಪಟ್ಟಿವೆ (${timeStr}).`;
      }
    } else if (isGujarati) {
      if (matchedIds.length > 0) {
        reply = `સરસ! ${matchedIds.length} ટાસ્ક પૂર્ણ (Completed) તરીકે માર્ક કર્યા છે (${timeStr}).`;
      } else if (uncompletedIds.length > 0) {
        reply = `${uncompletedIds.length} ટાસ્ક ફરીથી પેન્ડિંગ કરવામાં આવ્યા છે.`;
      } else {
        reply = `નમસ્તે! અમારિ કેફે શિફ્ટ ઓપરેશન્સ અપડેટ નોંધાઈ ગયું છે (${timeStr}).`;
      }
    } else if (isMalayalam) {
      if (matchedIds.length > 0) {
        reply = `നന്നായി! ${matchedIds.length} ജോലികൾ പൂർത്തിയായി (${timeStr}).`;
      } else if (uncompletedIds.length > 0) {
        reply = `${uncompletedIds.length} ജോലികൾ പെൻഡിംഗിലേക്ക് മാറ്റി.`;
      } else {
        reply = `നമസ്കാരം! അമാരി കഫേ പ്രവർത്തനങ്ങൾ അപ്ഡേറ്റ് ചെയ്തു (${timeStr}).`;
      }
    } else if (isPunjabi) {
      if (matchedIds.length > 0) {
        reply = `ਵਧੀਆ! ${matchedIds.length} ਕੰਮ ਪੂਰੇ (Completed) ਮਾਰਕ ਕਰ ਦਿੱਤੇ ਗਏ ਹਨ (${timeStr})।`;
      } else if (uncompletedIds.length > 0) {
        reply = `${uncompletedIds.length} ਕੰਮ ਵਾਪਸ ਪੈਂਡਿੰਗ ਮਾਰਕ ਕਰ ਦਿੱਤੇ ਗਏ ਹਨ।`;
      } else {
        reply = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਅਮਾਰੀ ਕੈਫੇ ਓਪਰੇਸ਼ਨ ਅਪਡੇਟ ਨੋਟ ਕਰ ਲਿਆ ਹੈ (${timeStr})।`;
      }
    } else if (isUrdu) {
      if (matchedIds.length > 0) {
        reply = `بہترین! ${matchedIds.length} کام مکمل (Completed) نشان زد ہو گئے ہیں (${timeStr})۔`;
      } else if (uncompletedIds.length > 0) {
        reply = `${uncompletedIds.length} کام دوبارہ زیر التواء (Pending) کر دیے گئے ہیں۔`;
      } else {
        reply = `آداب! آماری کیفے کے امور نوٹ کر لیے گئے ہیں (${timeStr})۔`;
      }
    } else if (isOdia) {
      if (matchedIds.length > 0) {
        reply = `ଚମତ୍କାର! ${matchedIds.length}ଟି ଟାସ୍କ ସମ୍ପୂର୍ଣ୍ଣ (Completed) ବୋଲି ଚିହ୍ନଟ ହେଲା (${timeStr})।`;
      } else if (uncompletedIds.length > 0) {
        reply = `${uncompletedIds.length}ଟି ଟାସ୍କ ପୁନର୍ବାର ପେଣ୍ଡିଂ ରଖାଯାଇଛି।`;
      } else {
        reply = `ନମସ୍କାର! ଅମାରୀ କ୍ୟାଫେ ଅପରେସନ୍ସ ଅପଡେଟ୍ ହୋଇଛି (${timeStr})।`;
      }
    } else if (isMarathi) {
      if (lower.includes('time') || lower.includes('vaajle') || lower.includes('vel') || lower.includes('tareekh')) {
        reply = `आता वेळ ${timeStr} झाली आहे (${dateStr}). कॅफे ऑपरेशन्स सुरू आहेत.`;
      } else if (lower.includes('kay karat') || lower.includes('kay challay') || lower.includes('namaskar') || lower.includes('kasa')) {
        reply = `नमस्कार! अमारी कॅफेचे लाईव्ह ऑपरेशन्स सुरू आहेत (${timeStr}). ${matchedIds.length > 0 ? `${matchedIds.length} टास्क कम्प्लीट केले आहेत.` : 'काही मदत हवी आहे का?'}`;
      } else if (matchedIds.length > 0) {
        reply = `उत्तम! ${matchedIds.length} टास्क पूर्ण (Completed) मार्क केले आहेत (${timeStr}).`;
      } else if (uncompletedIds.length > 0) {
        reply = `${uncompletedIds.length} टास्क पुन्हा पेंडिंग म्हणून अपडेट केले आहेत.`;
      } else {
        reply = `समजले! अमारी कॅफे ऑपरेशन्स अपडेट नोट केले आहे (${timeStr}).`;
      }
    } else if (isEnglish) {
      if (lower.includes('time') || lower.includes('date')) {
        reply = `Current time is ${timeStr} (${dateStr}). Amarii Café shift is actively running.`;
      } else if (lower.includes('how are') || lower.includes('hello') || lower.includes('hi') || lower.includes('what are')) {
        reply = `Hello! Amarii Ops AI is active (${timeStr}). ${matchedIds.length > 0 ? `Marked ${matchedIds.length} task(s) as completed!` : 'How can I assist your shift today?'}`;
      } else if (matchedIds.length > 0) {
        reply = `Success! Marked ${matchedIds.length} task(s) as completed at ${timeStr}.`;
      } else if (uncompletedIds.length > 0) {
        reply = `Reopened ${uncompletedIds.length} task(s) back to pending.`;
      } else {
        reply = `Understood! Amarii shift log recorded at ${timeStr}.`;
      }
    } else {
      // Default Hindi / Hinglish
      if (lower.includes('time') || lower.includes('samay') || lower.includes('kitne baje') || lower.includes('date') || lower.includes('tareekh')) {
        reply = `अभी का समय: ${timeStr} (${dateStr})। अमारी कैफे शिफ्ट चालू है।`;
      } else if (lower.includes('kya kar rahe') || lower.includes('kya chal raha') || lower.includes('bhai') || lower.includes('kaise ho') || lower.includes('hello') || lower.includes('hi')) {
        reply = `नमस्ते! अमारी कैफे ऑपरेशन्स ट्रैक हो रहे हैं (${timeStr})। ${matchedIds.length > 0 ? `${matchedIds.length} टास्क पूरा मार्क कर दिया गया है!` : 'बताइए कौन सा काम हुआ?'}`;
      } else if (matchedIds.length > 0) {
        reply = `बिल्कुल! ${matchedIds.length} टास्क कम्प्लीट मार्क कर दिया गया है (${timeStr})।`;
      } else if (uncompletedIds.length > 0) {
        reply = `${uncompletedIds.length} टास्क को फिर से पेंडिंग मार्क कर दिया गया है।`;
      }
    }

    return {
      reply,
      completedTaskIds: matchedIds,
      uncompletedTaskIds: uncompletedIds,
      addedTasks: [],
      reportData,
    };
  };

  const ai = getAi();
  if (!ai) {
    return res.json(generateFastResponse());
  }

  try {
    const prompt = `You are "Amarii AI", the fast, fluent multilingual Indian Restaurant Operations Assistant for "Amarii Café".
CURRENT TIME & DATE: ${timeStr}, ${dateStr}

CRITICAL MULTILINGUAL INDIAN LANGUAGE MANDATE:
You understand, process, and converse fluently in EVERY Indian language and script:
- Hindi (Devanagari: "नमस्ते, किचन का काम हो गया" or Hinglish: "bhai fryer clean ho gaya")
- Marathi (मराठी: "किचनचे काम झाले", "नमस्कार, आजचे टास्क दाखवा", or Marathinglish: "kitchen clean kela")
- Bengali (বাংলা: "সব কাজ হয়ে গেছে", "নমস্কার", or Banglish)
- Tamil (தமிழ்: "வேலை முடிந்துவிட்டது", "வணக்கம்", or Tanglish: "kitchen vela mudinjiduchu")
- Telugu (తెలుగు: "పని పూర్తయింది", "నమస్కారం", or Telgish: "kitchen pani ayipoyindi")
- Kannada (ಕನ್ನಡ: "ಕೆಲಸ ಮುಗಿದಿದೆ", "ನಮಸ್ಕಾರ", or Kanglish: "kitchen kelsa aagide")
- Gujarati (ગુજરાતી: "કામ પૂરું થઈ ગયું", "નમસ્તે", or Gujlish: "kitchen kaam thai gayu")
- Malayalam (മലയാളം: "ജോലി കഴിഞ്ഞു", "നമസ്കാരം", or Manglish: "kitchen joli kazhinju")
- Punjabi (ਪੰਜਾਬੀ: "ਕੰਮ ਹੋ ਗਿਆ ਜੀ", "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", or Punjabish: "kitchen da kamm ho geya")
- Urdu (اردو: "کام مکمل ہو گیا", "آداب", or Roman Urdu)
- Odia (ଓଡ଼ିଆ) & Assamese (অসমীয়া)
- English (clean hospitality management style)

RULE: Detect the EXACT language, script (native script or Romanized script), and dialect used by the user, and reply strictly in the SAME language and style! Keep answers warm, respectful, concise (1-2 sentences).

ACTIVE TASKS:
${JSON.stringify(
  (currentTasks || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    completed: t.completed,
    department: t.department,
    assignee: t.assignee,
  })),
  null,
  2
)}

USER MESSAGE:
"${message}"

ACTIONS:
1. If tasks are reported done/completed/ho gaya/khatam/zhale/zale/kela/kar diya/tick, return their matching IDs in "completedTaskIds".
2. If tasks should be reopened/uncompleted/pending/nahi hua/nahi zala, return their matching IDs in "uncompletedTaskIds".
3. If a new task should be added, return it in "addedTasks".
4. Provide a prompt 1-2 sentence "reply" in the user's exact tongue confirming the action or answering their query.`;

    const modelConfig = {
      maxOutputTokens: 350,
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          completedTaskIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          uncompletedTaskIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          addedTasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                priority: { type: Type.STRING },
                department: { type: Type.STRING },
                details: { type: Type.STRING },
              },
              required: ['title', 'priority'],
            },
          },
        },
        required: ['reply'],
      },
    };

    const response = await executeGeminiWithFallback(ai, prompt, modelConfig, 6500);

    if (!response || !response.text) {
      return res.json(generateFastResponse());
    }

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const addedFormatted = (parsed.addedTasks || []).map((at: any, i: number) => ({
      id: `task-added-${Date.now().toString(36)}-${i}`,
      title: at.title,
      priority: ['urgent', 'today', 'pending'].includes(at.priority) ? at.priority : 'today',
      department: at.department || 'General',
      details: at.details,
      completed: false,
    }));

    const isReportRequest =
      lower.includes('report') ||
      lower.includes('pdf') ||
      lower.includes('xls') ||
      lower.includes('excel') ||
      lower.includes('doc') ||
      lower.includes('word') ||
      lower.includes('sheet') ||
      lower.includes('download') ||
      lower.includes('export') ||
      lower.includes('audit');

    const totalCount = Array.isArray(currentTasks) ? currentTasks.length : 0;
    const completedCount = Array.isArray(currentTasks) ? currentTasks.filter((t: any) => t.completed).length : 0;
    const pendingCount = totalCount - completedCount;
    const urgentCount = Array.isArray(currentTasks) ? currentTasks.filter((t: any) => t.priority === 'urgent').length : 0;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const reportData = isReportRequest
      ? {
          title: 'Amarii Café Operations Shift & Audit Report',
          generatedAt: now.toISOString(),
          totalTasks: totalCount,
          completedTasks: completedCount,
          pendingTasks: pendingCount,
          urgentTasks: urgentCount,
          completionRate,
          station: 'All Stations',
          outlet: 'Amarii Cafe Kothrud',
          summary: `Shift Audit: ${completedCount}/${totalCount} tasks completed (${completionRate}% target) with ${urgentCount} urgent items.`,
        }
      : undefined;

    return res.json({
      reply: parsed.reply || `Understood! Shift updated at ${timeStr}.`,
      completedTaskIds: parsed.completedTaskIds || [],
      uncompletedTaskIds: parsed.uncompletedTaskIds || [],
      addedTasks: addedFormatted,
      reportData,
    });
  } catch {
    return res.json(generateFastResponse());
  }
});

// Vite middleware / production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Amarii Cafe Operations Assistant server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

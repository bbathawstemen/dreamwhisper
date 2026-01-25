// 梦境捕手 - 主应用逻辑

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const API_KEY = 'sk-c88c7f0df6294d85ba3908778c06f00f';

// 本地存储键名
const STORAGE_KEY = 'dream_diary';

// 当前状态
let currentEmotion = '';
let currentMode = 'psychological';
let currentDream = '';
let currentSituation = '';
let currentInterpretation = '';

// DOM 元素
const dreamInput = document.getElementById('dreamInput');
const interpretBtn = document.getElementById('interpretBtn');
const resultCard = document.getElementById('resultCard');
const resultContent = document.getElementById('resultContent');
const loadingOverlay = document.getElementById('loadingOverlay');
const historyList = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');
const saveBtn = document.getElementById('saveBtn');
const shareBtn = document.getElementById('shareBtn');
const shareModal = document.getElementById('shareModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const copyCardBtn = document.getElementById('copyCardBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 初始化 AOS 动画库
  AOS.init({
    duration: 600,
    easing: 'ease-out-cubic',
    once: true,
    offset: 50
  });
  
  initNavigation();
  initEmotionTags();
  initModeSelector();
  initInterpretBtn();
  initSaveBtn();
  initShareBtn();
  loadHistory();
});

// 顶部导航初始化
function initNavigation() {
  const navTabs = document.querySelectorAll('.nav-tab');
  const pages = document.querySelectorAll('.page');
  
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPage = tab.dataset.page;
      
      // 切换导航激活状态
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // 切换页面显示（带动画）
      pages.forEach(page => {
        if (page.id === `page${targetPage.charAt(0).toUpperCase() + targetPage.slice(1)}`) {
          page.classList.add('active');
          page.classList.add('fade-in');
          // 刷新 AOS 动画
          setTimeout(() => {
            AOS.refresh();
            page.classList.remove('fade-in');
          }, 400);
        } else {
          page.classList.remove('active');
        }
      });
      
      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// 情绪标签初始化
function initEmotionTags() {
  const tags = document.querySelectorAll('.tag');
  tags.forEach(tag => {
    tag.addEventListener('click', () => {
      tags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      currentEmotion = tag.dataset.emotion;
    });
  });
}

// 解析模式初始化
function initModeSelector() {
  const radios = document.querySelectorAll('input[name="mode"]');
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      currentMode = radio.value;
    });
  });
}

// 解梦按钮初始化
function initInterpretBtn() {
  interpretBtn.addEventListener('click', async () => {
    const dreamText = dreamInput.value.trim();
    
    // 收集境况信息
    const stressText = document.getElementById('situationStress').value.trim();
    const eventText = document.getElementById('situationEvent').value.trim();
    const emotionText = document.getElementById('situationEmotion').value.trim();
    
    // 组合境况描述
    let situationText = '';
    if (stressText) situationText += `【困扰/压力】${stressText}\n`;
    if (eventText) situationText += `【重要事件/决定】${eventText}\n`;
    if (emotionText) situationText += `【情感状态】${emotionText}\n`;
    situationText = situationText.trim();
    
    if (!dreamText) {
      showToast('请先描述你的梦境');
      dreamInput.focus();
      return;
    }
    
    currentDream = dreamText;
    currentSituation = situationText;
    await interpretDream(dreamText, situationText);
  });
}

// 保存按钮初始化
function initSaveBtn() {
  saveBtn.addEventListener('click', () => {
    if (!currentDream || !currentInterpretation) return;
    
    const reflection = document.getElementById('reflectionInput').value.trim();
    
    saveDream({
      dream: currentDream,
      situation: currentSituation,
      interpretation: currentInterpretation,
      reflection: reflection,
      emotion: currentEmotion,
      mode: currentMode,
      date: new Date().toISOString()
    });
    
    showToast('已保存到梦境日记 ✨');
  });
}

// 分享按钮初始化
function initShareBtn() {
  shareBtn.addEventListener('click', () => {
    if (!currentDream || !currentInterpretation) return;
    showShareModal();
  });
  
  closeModalBtn.addEventListener('click', () => {
    shareModal.style.display = 'none';
  });
  
  copyCardBtn.addEventListener('click', () => {
    const text = `🌙 梦境捕手\n\n【我的梦境】\n${currentDream}\n\n【解析】\n${currentInterpretation}\n\n——「把昨夜的梦，翻译成今天的诗」`;
    navigator.clipboard.writeText(text).then(() => {
      showToast('已复制到剪贴板');
    });
  });
  
  // 点击背景关闭
  shareModal.querySelector('.modal-backdrop').addEventListener('click', () => {
    shareModal.style.display = 'none';
  });
}

// 解梦 API 调用
async function interpretDream(dreamText, situationText) {
  showLoading(true);
  
  const emotionText = getEmotionText(currentEmotion);
  const systemPrompt = getSystemPrompt(currentMode);
  
  let userPrompt = `请解析以下梦境`;
  if (emotionText) {
    userPrompt += `（做梦时的情绪：${emotionText}）`;
  }
  userPrompt += `：

【梦境内容】
"${dreamText}"
`;

  if (situationText) {
    userPrompt += `
【做梦者的近期境况】
"${situationText}"

请结合做梦者的现实境况，深入分析这个梦境反映了什么潜意识想法，梦境与现实之间有什么关联。
`;
  }

  userPrompt += `
请用富有诗意和温度的语言进行解析，分段输出，每段2-3句话。重点分析潜意识在表达什么。`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.85,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      throw new Error('API 请求失败');
    }

    const data = await response.json();
    const interpretation = data.choices[0].message.content.trim();
    
    currentInterpretation = interpretation;
    displayResult(interpretation);
    
  } catch (error) {
    console.error('解梦失败:', error);
    showToast('解析失败，请稍后重试');
  } finally {
    showLoading(false);
  }
}

// 获取系统提示词
function getSystemPrompt(mode) {
  if (mode === 'psychological') {
    return `你是一位温柔而富有洞察力的心理分析师，专注于荣格式梦境解析。你的核心任务是帮助做梦者通过梦境更好地了解自己的内心。

你的解读风格：
1. 将梦境视为潜意识与意识的对话桥梁
2. 关注梦中的原型意象（阴影、阿尼玛/阿尼姆斯、智慧老人等）
3. 如果做梦者提供了现实境况，深入分析梦境与现实的关联
4. 揭示做梦者可能没有意识到的内心想法、压抑的情绪、未被满足的需求
5. 用诗意、温暖的语言，像一位智慧的朋友
6. 每段以换行分隔，便于阅读

重要：在解析的最后，以「🌙 梦的引导」为标题，提出2-3个引导性的反思问题，帮助做梦者进一步探索内心，例如：
- "梦中的XX是否让你联想到现实中的某个人或某件事？"
- "当你想到XX时，内心最真实的感受是什么？"
- "如果梦中的你可以做出不同的选择，你会怎么做？"

回复控制在300-400字。

记住：你的目标是帮助做梦者更深入地了解自己。`;
  } else {
    return `你是一位神秘而亲切的占卜师，擅长将梦境与星象、塔罗、东方玄学结合解读。

你的风格：
1. 融合星座、塔罗牌、周公解梦等元素
2. 如果做梦者提供了现实境况，结合境况给出针对性的指引
3. 语言神秘但不故弄玄虚，有趣味性
4. 给出一些轻松的运势提示或建议
5. 偶尔使用一些占卜术语增加氛围感
6. 保持温暖和正面引导，避免恐吓式解读
7. 每段以换行分隔

重要：在解析的最后，以「🌙 梦的引导」为标题，提出1-2个启发性的问题，引导做梦者思考梦境与自己的关联。

回复控制在300-400字。

记住：你是在给做梦者一份来自神秘世界的温柔指引，同时帮助他们更了解自己。`;
  }
}

// 获取情绪文本
function getEmotionText(emotion) {
  const emotionMap = {
    'peaceful': '平静安宁',
    'happy': '愉悦开心',
    'anxious': '焦虑不安',
    'fearful': '恐惧害怕',
    'confused': '迷茫困惑',
    'nostalgic': '怀旧伤感'
  };
  return emotionMap[emotion] || '';
}

// 显示解析结果
function displayResult(interpretation) {
  const scrollContent = document.getElementById('scrollContent');
  
  // 将文本分成段落并生成 HTML
  const paragraphs = interpretation
    .split('\n')
    .filter(line => line.trim())
    .map(line => `<div class="scroll-paragraph">${line.trim()}</div>`)
    .join('');
  
  scrollContent.innerHTML = paragraphs;
  
  // 显示结果区域
  resultCard.style.display = 'block';
  
  // 刷新 AOS 并滚动到结果
  setTimeout(() => {
    AOS.refresh();
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// 格式化解析文本（保留兼容）
function formatInterpretation(text) {
  return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => `<p>${line}</p>`)
    .join('');
}

// 显示/隐藏加载
function showLoading(show) {
  loadingOverlay.style.display = show ? 'flex' : 'none';
  interpretBtn.disabled = show;
}

// 保存梦境到本地
function saveDream(dreamData) {
  const dreams = getDreams();
  dreams.unshift(dreamData);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dreams));
  loadHistory();
}

// 获取所有梦境
function getDreams() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// 删除梦境
function deleteDream(index) {
  const dreams = getDreams();
  dreams.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dreams));
  loadHistory();
}

// 加载历史记录
function loadHistory() {
  const dreams = getDreams();
  historyCount.textContent = dreams.length;
  
  if (dreams.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🌙</span>
        <p>还没有记录梦境</p>
        <p class="empty-hint">开始记录你的第一个梦吧</p>
      </div>
    `;
    return;
  }
  
  historyList.innerHTML = dreams.map((dream, index) => `
    <div class="history-item" data-index="${index}">
      <div class="history-item-header">
        <span class="history-item-date">${formatDate(dream.date)}</span>
        <span class="history-item-emotion">${getEmotionEmoji(dream.emotion)}</span>
        <button class="history-item-delete" onclick="event.stopPropagation(); deleteDream(${index})">✕</button>
      </div>
      <div class="history-item-dream">${dream.dream}</div>
    </div>
  `).join('');
  
  // 点击历史记录查看详情
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      const dream = dreams[index];
      showDreamDetail(dream);
    });
  });
}

// 显示梦境详情
function showDreamDetail(dream) {
  dreamInput.value = dream.dream;
  
  // 清空境况输入框（旧数据格式兼容）
  document.getElementById('situationStress').value = '';
  document.getElementById('situationEvent').value = '';
  document.getElementById('situationEmotion').value = '';
  
  currentDream = dream.dream;
  currentSituation = dream.situation || '';
  currentInterpretation = dream.interpretation;
  currentEmotion = dream.emotion;
  currentMode = dream.mode;
  
  // 设置情绪标签
  document.querySelectorAll('.tag').forEach(tag => {
    tag.classList.toggle('active', tag.dataset.emotion === dream.emotion);
  });
  
  // 设置模式
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.checked = radio.value === dream.mode;
  });
  
  // 显示解析
  displayResult(dream.interpretation);
  
  // 显示感悟（如果有）
  document.getElementById('reflectionInput').value = dream.reflection || '';
  
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 格式化日期
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hour}:${minute}`;
}

// 获取情绪 emoji
function getEmotionEmoji(emotion) {
  const emojiMap = {
    'peaceful': '🌊',
    'happy': '✨',
    'anxious': '🌀',
    'fearful': '🌑',
    'confused': '🌫️',
    'nostalgic': '🍂'
  };
  return emojiMap[emotion] || '🌙';
}

// 显示分享模态框
function showShareModal() {
  document.getElementById('shareDate').textContent = formatDate(new Date().toISOString());
  document.getElementById('shareDream').textContent = currentDream.length > 100 
    ? currentDream.substring(0, 100) + '...' 
    : currentDream;
  document.getElementById('shareInterpretation').textContent = currentInterpretation.length > 200
    ? currentInterpretation.substring(0, 200) + '...'
    : currentInterpretation;
  
  shareModal.style.display = 'flex';
}

// Toast 提示
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(167, 139, 250, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 14px;
    z-index: 1002;
    animation: toastIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Toast 动画样式
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes toastOut {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  }
`;
document.head.appendChild(toastStyle);

// 将 deleteDream 暴露到全局
window.deleteDream = deleteDream;

// ========== 梦境灵感 - 自我探索模块 ==========

// 梦境主题数据
const DREAM_THEMES = {
  flying: {
    title: '🕊️ 飞翔',
    meaning: '飞翔的梦通常象征着对自由的渴望、想要摆脱束缚的心理。它也可能代表你对某件事充满信心，感觉自己能够超越障碍。',
    psychology: '从心理学角度，飞翔梦反映了自我超越的愿望。如果飞得轻松自在，可能表示你正处于自信满满的状态；如果飞得吃力或害怕坠落，可能暗示你对失去控制感到焦虑。',
    questions: [
      '在梦中飞翔时，你感到自由还是恐惧？',
      '现实中有什么让你感到被束缚的事情吗？',
      '你最近是否渴望逃离某种处境？'
    ]
  },
  falling: {
    title: '⬇️ 坠落',
    meaning: '坠落的梦是最常见的梦境之一，通常与失控感、不安全感或对失败的恐惧有关。它可能反映你在现实中感到某些事情正在"失控"。',
    psychology: '坠落梦常常出现在压力大或面临重大变化的时期。它可能是潜意识在提醒你需要重新获得生活的掌控感，或者需要面对某个你一直回避的问题。',
    questions: [
      '最近有什么事情让你感到失控吗？',
      '你是否担心某件事会"一落千丈"？',
      '在坠落前你在做什么？那个场景有什么含义？'
    ]
  },
  chasing: {
    title: '🏃 追逐',
    meaning: '被追逐的梦通常象征着你在逃避某些事情——可能是压力、责任、恐惧或某个你不想面对的问题。追逐者往往代表你内心压抑的东西。',
    psychology: '追逐者的身份很重要：如果是怪物，可能代表恐惧；如果是人，可能代表你想逃避的责任或关系。试着停下来面对追逐者，可能会发现它并没有那么可怕。',
    questions: [
      '追逐你的是什么/谁？它让你联想到什么？',
      '你在现实中有什么一直在逃避的事情吗？',
      '如果你停下来面对追逐者，你觉得会发生什么？'
    ]
  },
  water: {
    title: '🌊 水',
    meaning: '水在梦中通常象征情感和潜意识。平静的水代表内心平和，汹涌的水可能表示情绪波动，浑浊的水可能暗示困惑或压抑的情绪。',
    psychology: '水的状态反映了你的情感状态。溺水可能表示被情绪淹没；在水中自在游泳可能表示你与自己的情感和谐相处；站在水边可能表示你正在探索自己的内心世界。',
    questions: [
      '梦中的水是什么状态？清澈还是浑浊？平静还是汹涌？',
      '你与水的关系是什么？是享受还是恐惧？',
      '最近有什么情绪你一直没有表达出来？'
    ]
  },
  deceased: {
    title: '👤 故人',
    meaning: '梦见已故的人通常反映了我们对他们的思念，或者他们在我们生命中的重要意义。这类梦也可能是潜意识在处理未完成的情感。',
    psychology: '故人在梦中说的话或做的事可能代表你内心的声音。这类梦有时是在帮助我们完成告别，有时是在提醒我们他们留给我们的人生智慧。',
    questions: [
      '梦中的故人对你说了什么？做了什么？',
      '你和这个人之间有没有未完成的心愿或未说出的话？',
      '这个人生前给你最重要的影响是什么？'
    ]
  },
  lost: {
    title: '🌀 迷路',
    meaning: '迷路的梦通常反映了现实中的迷茫感——可能是对人生方向、职业选择或某段关系的困惑。它也可能表示你正处于人生的转折点。',
    psychology: '迷路梦提醒我们需要停下来思考方向。梦中迷失的地点往往有象征意义：在城市迷路可能与事业相关，在森林迷路可能与内心探索相关。',
    questions: [
      '你在什么地方迷路了？那个地方让你联想到什么？',
      '现实中你是否对某件事感到迷茫？',
      '你内心深处知道自己想去哪里吗？'
    ]
  },
  exam: {
    title: '📝 考试',
    meaning: '考试的梦非常普遍，通常与被评判、害怕失败或准备不足的焦虑有关。即使早已毕业，这类梦仍会在压力大时出现。',
    psychology: '考试梦往往出现在我们面临某种"考验"之前——可能是工作面试、重要项目或人生决定。它反映了我们对自我价值的担忧和对表现的期待。',
    questions: [
      '梦中的考试你准备好了吗？考的是什么？',
      '现实中你是否感到正在被"考验"或评判？',
      '你是否对自己有过高的期望和要求？'
    ]
  },
  teeth: {
    title: '🦷 牙齿',
    meaning: '牙齿脱落的梦是最常见的焦虑梦之一，通常与外表、自信、沟通能力或对衰老的担忧有关。',
    psychology: '牙齿象征着我们的外在形象和表达能力。掉牙的梦可能反映了对失去吸引力、说错话或无法有效沟通的恐惧。它也可能与失去控制或某种丧失有关。',
    questions: [
      '你最近是否对自己的外表或形象有所担忧？',
      '有没有什么话你想说但一直没说出口？',
      '你是否担心失去某样重要的东西？'
    ]
  }
};

// 梦境象征词典
const DREAM_SYMBOLS = [
  { symbol: '🏠 房子', meaning: '代表自我、内心世界。不同房间代表人格的不同层面。' },
  { symbol: '🚗 车', meaning: '代表人生旅程、对生活的掌控力。驾驶状态反映你的自主感。' },
  { symbol: '🐍 蛇', meaning: '可能代表恐惧、智慧、转变或隐藏的威胁，取决于你的感受。' },
  { symbol: '👶 婴儿', meaning: '代表新的开始、内心的纯真部分，或需要呵护的新想法。' },
  { symbol: '🪞 镜子', meaning: '代表自我认知、自我反省。镜中的形象反映你对自己的看法。' },
  { symbol: '🚪 门', meaning: '代表机会、新的可能性或过渡。关闭的门可能表示错过或阻碍。' },
  { symbol: '🌳 树', meaning: '代表生命力、成长和根基。树的状态反映你的生命状态。' },
  { symbol: '🔥 火', meaning: '代表激情、愤怒、转化或破坏。火的大小反映情感的强度。' }
];

// 梦境符号头像
const DREAM_AVATARS = ['🕊️', '🌙', '🔑', '🦋', '🌊', '⭐', '🌸', '🍃', '🔮', '💫', '🌈', '🦢'];

// 同梦者数据（模拟）
const DREAMERS_DATA = [
  { avatar: '🕊️', keyword: '飞翔', time: '刚刚', type: 'flying' },
  { avatar: '⬇️', keyword: '坠落', time: '3分钟前', type: 'falling' },
  { avatar: '🏃', keyword: '追逐', time: '5分钟前', type: 'chasing' },
  { avatar: '👥', keyword: '重逢', time: '8分钟前', type: 'reunion' },
  { avatar: '🌊', keyword: '水', time: '12分钟前', type: 'water' },
  { avatar: '🌀', keyword: '迷路', time: '15分钟前', type: 'lost' },
  { avatar: '🦋', keyword: '飞翔', time: '20分钟前', type: 'flying' },
  { avatar: '💧', keyword: '水', time: '25分钟前', type: 'water' },
];

// 漂流瓶数据（模拟）
const FEED_DATA = [
  {
    avatar: '🦋',
    name: '匿名梦旅人',
    time: '10分钟前',
    content: '梦见自己在云端飞翔，俯瞰整座城市，感觉特别自由。醒来后心情很好，但也有点怅然若失...',
    tags: ['飞翔', '自由', '城市'],
    type: 'flying',
    resonance: 24
  },
  {
    avatar: '🌊',
    name: '深海潜行者',
    time: '30分钟前',
    content: '又梦见那片蔚蓝的海了，我在水下呼吸，看到五彩斑斓的珊瑚。奇怪的是完全不害怕，反而很平静。',
    tags: ['水', '海洋', '平静'],
    type: 'water',
    resonance: 18
  },
  {
    avatar: '👥',
    name: '时光漫步者',
    time: '1小时前',
    content: '梦见了去世多年的外婆，她还是记忆中的样子，笑着给我做饭。醒来枕头湿了一片。',
    tags: ['重逢', '故人', '思念'],
    type: 'reunion',
    resonance: 56
  },
  {
    avatar: '🏃',
    name: '迷雾行者',
    time: '2小时前',
    content: '被什么东西追着跑，怎么也跑不快，腿像灌了铅。最后躲进一个房间才醒过来，心跳好快。',
    tags: ['追逐', '恐惧', '逃跑'],
    type: 'chasing',
    resonance: 31
  }
];

let currentKeyword = 'all';

// 初始化同梦星球模块
function initPlanetModule() {
  renderDreamers(currentKeyword);
  renderFeed(currentKeyword);
  renderInspirationCard(currentKeyword);
  initKeywordEvents();
  initFeedEvents();
}

// 渲染同梦者列表
function renderDreamers(keyword) {
  const container = document.getElementById('dreamersScroll');
  if (!container) return;
  
  const filtered = keyword === 'all' 
    ? DREAMERS_DATA 
    : DREAMERS_DATA.filter(d => d.type === keyword);
  
  if (filtered.length === 0) {
    container.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px;">暂无同梦者</p>';
    return;
  }
  
  container.innerHTML = filtered.map(dreamer => `
    <div class="dreamer-card" data-type="${dreamer.type}">
      <div class="dreamer-avatar">${dreamer.avatar}</div>
      <div class="dreamer-keyword">${dreamer.keyword}</div>
      <div class="dreamer-time">${dreamer.time}</div>
    </div>
  `).join('');
}

// 渲染漂流瓶
function renderFeed(keyword) {
  const container = document.getElementById('feedList');
  if (!container) return;
  
  const filtered = keyword === 'all'
    ? FEED_DATA
    : FEED_DATA.filter(f => f.type === keyword);
  
  if (filtered.length === 0) {
    container.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; text-align: center; padding: 20px;">这片星空暂时没有漂流瓶...</p>';
    return;
  }
  
  container.innerHTML = filtered.map((item, index) => `
    <div class="feed-item" data-index="${index}">
      <div class="feed-header">
        <div class="feed-avatar">${item.avatar}</div>
        <div class="feed-info">
          <div class="feed-name">${item.name}</div>
          <div class="feed-meta">${item.time}</div>
        </div>
      </div>
      <div class="feed-content">${item.content}</div>
      <div class="feed-tags">
        ${item.tags.map(tag => `<span class="feed-tag">#${tag}</span>`).join('')}
      </div>
      <div class="feed-actions">
        <button class="feed-action resonate-btn" data-index="${index}">
          <span>💫</span>
          <span>共鸣 ${item.resonance}</span>
        </button>
        <button class="feed-action">
          <span>💭</span>
          <span>说说感受</span>
        </button>
      </div>
    </div>
  `).join('');
}

// 渲染灵感卡片（基于当前关键词）
function renderInspirationCard(keyword) {
  const container = document.getElementById('themeInterpretation');
  if (!container) return;
  
  const themeKey = keyword === 'all' ? 'flying' : keyword;
  const theme = DREAM_THEMES[themeKey];
  
  if (!theme) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <div class="interpretation-card">
      <h3 class="interpretation-title">${theme.title}</h3>
      <div class="interpretation-section">
        <h4 class="section-label">💭 这类梦的含义</h4>
        <p class="section-text">${theme.meaning}</p>
      </div>
      <div class="interpretation-section">
        <h4 class="section-label">🌙 梦的引导</h4>
        <ul class="question-list">
          ${theme.questions.map(q => `<li>${q}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

// 初始化关键词事件
function initKeywordEvents() {
  const keywordBtns = document.querySelectorAll('.keyword-btn');
  
  keywordBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      keywordBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentKeyword = btn.dataset.keyword;
      renderDreamers(currentKeyword);
      renderFeed(currentKeyword);
      renderInspirationCard(currentKeyword);
    });
  });
}

// 初始化漂流瓶事件
function initFeedEvents() {
  const feedList = document.getElementById('feedList');
  if (!feedList) return;
  
  feedList.addEventListener('click', (e) => {
    const resonateBtn = e.target.closest('.resonate-btn');
    if (resonateBtn) {
      resonateBtn.classList.toggle('resonated');
      const span = resonateBtn.querySelector('span:last-child');
      const index = parseInt(resonateBtn.dataset.index);
      if (resonateBtn.classList.contains('resonated')) {
        FEED_DATA[index].resonance++;
      } else {
        FEED_DATA[index].resonance--;
      }
      span.textContent = `共鸣 ${FEED_DATA[index].resonance}`;
    }
  });
  
  // 发布按钮
  const shareBtn = document.getElementById('shareDreamBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      alert('漂流瓶功能开发中...\n\n未来你可以匿名分享你的梦境，寻找同频的梦旅人！');
    });
  }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initPlanetModule, 500);
});

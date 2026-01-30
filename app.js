// Dreamwhisper - 主应用逻辑

// API 配置
const API_CONFIG = {
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    defaultKey: 'sk-c88c7f0df6294d85ba3908778c06f00f',
    keyLink: 'https://platform.deepseek.com/api_keys',
    hint: '💡 deepseek-chat 是性价比最高的选择'
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    defaultKey: '',
    keyLink: 'https://platform.openai.com/api-keys',
    hint: '💡 GPT-5.2 最新最强，GPT-4o-mini 便宜好用'
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    defaultKey: '',
    keyLink: 'https://aistudio.google.com/app/apikey',
    hint: '💡 Gemini 3 Flash 推荐，快速强大'
  }
};

// 本地存储键名
const STORAGE_KEY = 'dream_diary';
const SETTINGS_KEY = 'dream_ai_settings';

// AI 设置
let aiSettings = {
  provider: 'deepseek',
  model: 'deepseek-chat',
  apiKey: '',
  baseUrl: ''
};

// 当前状态
let currentEmotion = '';
let currentMode = 'psychological';
let currentDream = '';
let currentSituation = '';
let currentInterpretation = '';
let currentMBTI = '';

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
  
  loadAISettings();
  initNavigation();
  initEmotionTags();
  initModeSelector();
  initMBTISelector();
  initInterpretBtn();
  initSaveBtn();
  initShareBtn();
  initSettingsModal();
  initVoiceInput();
  loadHistory();
});

// 顶部导航初始化
function initNavigation() {
  const navTabs = document.querySelectorAll('.nav-tab:not(.settings-tab)');
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

// MBTI 选择器初始化
function initMBTISelector() {
  const mbtiTags = document.querySelectorAll('.mbti-tag');
  mbtiTags.forEach(tag => {
    tag.addEventListener('click', () => {
      // 如果点击已选中的，取消选中
      if (tag.classList.contains('active')) {
        tag.classList.remove('active');
        currentMBTI = '';
      } else {
        // 移除其他选中状态
        mbtiTags.forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        currentMBTI = tag.dataset.mbti;
      }
    });
  });
}

// 获取 MBTI 人格描述
function getMBTIDescription(mbti) {
  const mbtiDescriptions = {
    'INTJ': '内向直觉思考判断型，善于战略思维，追求效率和逻辑',
    'INTP': '内向直觉思考知觉型，热爱分析和理论，追求知识和理解',
    'ENTJ': '外向直觉思考判断型，天生的领导者，果断且有远见',
    'ENTP': '外向直觉思考知觉型，喜欢辩论和创新，思维敏捷',
    'INFJ': '内向直觉情感判断型，有洞察力和理想主义，关注他人感受',
    'INFP': '内向直觉情感知觉型，富有想象力和同理心，追求内心和谐',
    'ENFJ': '外向直觉情感判断型，富有魅力和感染力，善于激励他人',
    'ENFP': '外向直觉情感知觉型，热情洋溢，富有创造力和好奇心',
    'ISTJ': '内向感觉思考判断型，可靠务实，重视责任和传统',
    'ISFJ': '内向感觉情感判断型，温暖体贴，默默付出的守护者',
    'ESTJ': '外向感觉思考判断型，组织能力强，重视秩序和规则',
    'ESFJ': '外向感觉情感判断型，热心助人，重视和谐与合作',
    'ISTP': '内向感觉思考知觉型，冷静分析，喜欢动手解决问题',
    'ISFP': '内向感觉情感知觉型，敏感艺术，活在当下享受生活',
    'ESTP': '外向感觉思考知觉型，行动派，喜欢冒险和刺激',
    'ESFP': '外向感觉情感知觉型，活泼开朗，天生的表演者'
  };
  return mbtiDescriptions[mbti] || '';
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
    const text = `🌙 Dreamwhisper\n\n【我的梦境】\n${currentDream}\n\n【解析】\n${currentInterpretation}\n\n——「把昨夜的梦，翻译成今天的诗」`;
    navigator.clipboard.writeText(text).then(() => {
      showToast('已复制到剪贴板');
    });
  });
  
  // 点击背景关闭
  shareModal.querySelector('.modal-backdrop').addEventListener('click', () => {
    shareModal.style.display = 'none';
  });
  
  // 分享到同梦星球按钮
  const shareToPlanetBtn = document.getElementById('shareToPlanetBtn');
  if (shareToPlanetBtn) {
    shareToPlanetBtn.addEventListener('click', () => {
      if (!currentDream || !currentInterpretation) return;
      openShareToPlanetModal();
    });
  }
}

// 打开分享到同梦星球弹窗
function openShareToPlanetModal() {
  // 检查是否已登录
  if (!isLoggedIn()) {
    showToast('请先连接钱包');
    return;
  }
  
  const modal = document.getElementById('publishModal');
  if (!modal) return;
  
  // 预填充梦境内容
  document.getElementById('publishDreamInput').value = currentDream;
  document.getElementById('publishCustomTags').value = '';
  document.querySelectorAll('.publish-tag').forEach(t => t.classList.remove('active'));
  
  // 根据情绪自动选择主题
  if (currentEmotion) {
    const emotionToType = {
      'peaceful': 'water',
      'happy': 'flying',
      'anxious': 'chasing',
      'fearful': 'falling',
      'confused': 'lost',
      'nostalgic': 'reunion'
    };
    const suggestedType = emotionToType[currentEmotion];
    if (suggestedType) {
      const tag = document.querySelector(`.publish-tag[data-type="${suggestedType}"]`);
      if (tag) tag.classList.add('active');
    }
  }
  
  modal.style.display = 'flex';
}

// 解梦 API 调用
async function interpretDream(dreamText, situationText) {
  showLoading(true);
  
  const emotionText = getEmotionText(currentEmotion);
  const mbtiDesc = getMBTIDescription(currentMBTI);
  const systemPrompt = getSystemPrompt(currentMode, currentMBTI, mbtiDesc);
  
  let userPrompt = `请解析以下梦境`;
  if (emotionText) {
    userPrompt += `（做梦时的情绪：${emotionText}）`;
  }
  userPrompt += `：

【梦境内容】
"${dreamText}"
`;

  if (currentMBTI && mbtiDesc) {
    userPrompt += `
【做梦者的 MBTI 人格】
${currentMBTI}（${mbtiDesc}）
`;
  }

  if (situationText) {
    userPrompt += `
【做梦者的近期境况】
"${situationText}"
`;
  }

  userPrompt += `
请结合做梦者的人格特点和现实境况，深入分析这个梦境反映了什么潜意识想法，梦境与现实之间有什么关联。
请用富有诗意和温度的语言进行解析，分段输出，每段2-3句话。重点分析潜意识在表达什么。`;

  try {
    const interpretation = await callAI(systemPrompt, userPrompt);
    currentInterpretation = interpretation;
    displayResult(interpretation);
  } catch (error) {
    console.error('解梦失败:', error);
    showToast(error.message || '解析失败，请稍后重试');
  } finally {
    showLoading(false);
  }
}

// 统一 AI 调用函数
async function callAI(systemPrompt, userPrompt) {
  const { provider, model, apiKey, baseUrl } = aiSettings;
  const config = API_CONFIG[provider];
  const finalApiKey = apiKey || config.defaultKey;
  
  if (!finalApiKey) {
    throw new Error(`请先在设置中配置 ${provider.toUpperCase()} 的 API Key`);
  }
  
  if (provider === 'gemini') {
    return await callGeminiAPI(model, systemPrompt, userPrompt, finalApiKey, baseUrl);
  } else {
    return await callOpenAICompatibleAPI(provider, model, systemPrompt, userPrompt, finalApiKey, baseUrl);
  }
}

// OpenAI 兼容接口调用 (DeepSeek, OpenAI)
async function callOpenAICompatibleAPI(provider, model, systemPrompt, userPrompt, apiKey, baseUrl) {
  const config = API_CONFIG[provider];
  
  // 使用自定义地址或默认地址
  let apiUrl = config.url;
  if (baseUrl) {
    // 移除末尾斜杠，拼接路径
    apiUrl = baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.85,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Gemini API 调用
async function callGeminiAPI(model, systemPrompt, userPrompt, apiKey, baseUrl) {
  let url;
  if (baseUrl) {
    // 使用中转地址，移除末尾斜杠和可能的 /v1 路径
    const cleanBase = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
    url = cleanBase + `/v1beta/models/${model}:generateContent?key=${apiKey}`;
  } else {
    url = API_CONFIG.gemini.url.replace('{model}', model) + `?key=${apiKey}`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: systemPrompt + '\n\n' + userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 800
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}

// 获取系统提示词
function getSystemPrompt(mode, mbti, mbtiDesc) {
  let mbtiContext = '';
  if (mbti && mbtiDesc) {
    mbtiContext = `
【重要】做梦者是 ${mbti} 人格类型（${mbtiDesc}）。请根据这种人格特点调整你的解读：
- 分析梦境如何反映该人格的典型心理模式和内心需求
- 考虑该人格类型常见的压力来源和应对方式
- 用符合该人格偏好的沟通方式来表达（例如：思考型偏好逻辑分析，情感型偏好共情理解）
- 给出适合该人格特点的建议和引导
`;
  }

  if (mode === 'psychological') {
    return `你是一位对弗洛伊德梦的解析理论了解非常深的梦境解析师 AI。
${mbtiContext}
你的解读风格：
1. 基于弗洛伊德理论，分析梦境中的场景、人物、情绪、符号及其特殊意义
2. 关注梦境中重复出现的元素，挖掘其潜意识含义
3. 分析梦境过程和清醒后的情绪体验之间的关联
4. 如果做梦者提供了 MBTI 人格，结合其人格特点进行个性化解读
5. 揭示梦境背后隐藏的欲望、压抑的情感和未解决的冲突
6. 用专业但易懂的语言，像一位经验丰富的心理分析师
7. 每段以换行分隔，便于阅读

重要：在解析的最后，以「🌙 梦的引导」为标题，通过提问引导做梦者自由联想和补充信息：
- 引导客户联想梦中符号与现实生活的关联
- 询问是否有相关的困扰或疑问
- 如果发现缺失关键细节，简短提问引导客户分享更多信息
- 提出2-3个引导性的反思问题，帮助做梦者进一步探索内心

回复控制在300-400字。

记住：你的目标是通过弗洛伊德式的分析，帮助做梦者理解潜意识中的真实想法。`;
  } else {
    return `你是一位精通传统解梦理论的资深文化学者，专注于《周公解梦》等传统解梦体系的研究与实践，拥有20年的解梦经验，擅长从传统文化角度解析梦境象征意义。
${mbtiContext}
你的专业背景：
- 精通《周公解梦》《穷通宝鉴》《滴天髓》《易经》《奇门遁甲》《三命通会》《子平真诠》《渊海子平》等传统典籍
- 熟悉中国传统文化中的象征体系
- 了解阴阳五行在解梦中的应用
- 掌握传统解梦的实践技巧和方法

你的解读风格：
1. 基于中国传统文化和解梦理论进行分析
2. 解释梦境元素在传统文化中的象征意义
3. 运用阴阳五行理论辅助解读
4. 如果做梦者提供了现实境况，结合境况给出针对性的指引
5. 如果做梦者提供了 MBTI 人格，可以结合人格特点给出更契合的解读
6. 语言通俗易懂，避免过于玄奥，但保持传统文化的原汁原味
7. 避免绝对化的解释，强调参考性质
8. 保持温暖和正面引导，不提供医疗或心理诊断建议
9. 每段以换行分隔

重要：在解析的最后，以「🌙 梦的引导」为标题：
- 提供常见梦境元素的传统象征意义参考
- 给出实用可操作的建议
- 提出1-2个启发性的问题，引导做梦者思考梦境与自己的关联

回复控制在300-400字。

记住：你是在用传统文化的智慧为做梦者提供参考和指引，帮助他们从传统视角理解梦境。`;
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

// ========== 语音输入模块 ==========
let speechRecognition = null;
let isRecording = false;
let voiceFinalTranscript = '';

function initVoiceInput() {
  const voiceBtn = document.getElementById('voiceBtn');
  if (!voiceBtn) {
    console.log('语音按钮未找到');
    return;
  }
  
  // 检查浏览器是否支持语音识别
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.log('浏览器不支持语音识别');
    // 不隐藏按钮，点击时提示
    voiceBtn.addEventListener('click', () => {
      showToast('您的浏览器不支持语音识别，请使用 Chrome 浏览器');
    });
    return;
  }
  
  // 初始化语音识别
  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;
  speechRecognition.lang = 'zh-CN';
  
  speechRecognition.onstart = () => {
    isRecording = true;
    voiceFinalTranscript = dreamInput.value;
    voiceBtn.classList.add('recording');
    voiceBtn.querySelector('.voice-text').textContent = '录音中...';
    voiceBtn.querySelector('.voice-icon').textContent = '🔴';
    console.log('语音识别已启动');
  };
  
  speechRecognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        voiceFinalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    dreamInput.value = voiceFinalTranscript + interimTranscript;
  };
  
  speechRecognition.onerror = (event) => {
    console.error('语音识别错误:', event.error);
    stopRecording();
    if (event.error === 'not-allowed') {
      showToast('请允许麦克风权限');
    } else if (event.error === 'no-speech') {
      showToast('未检测到语音，请再试一次');
    } else if (event.error === 'network') {
      showToast('网络错误，请检查网络连接');
    } else {
      showToast('语音识别出错: ' + event.error);
    }
  };
  
  speechRecognition.onend = () => {
    console.log('语音识别结束, isRecording:', isRecording);
    if (isRecording) {
      // 如果是意外结束，尝试重新开始
      try {
        speechRecognition.start();
      } catch (e) {
        console.error('重启语音识别失败:', e);
        stopRecording();
      }
    }
  };
  
  // 点击按钮切换录音状态
  voiceBtn.addEventListener('click', () => {
    console.log('语音按钮被点击, 当前状态:', isRecording ? '录音中' : '未录音');
    if (isRecording) {
      stopRecording();
      showToast('语音输入已停止');
    } else {
      startRecording();
    }
  });
  
  console.log('语音输入模块初始化完成');
}

function startRecording() {
  if (!speechRecognition) {
    showToast('语音识别未初始化');
    return;
  }
  try {
    speechRecognition.start();
    showToast('开始语音输入，请说话...');
  } catch (e) {
    console.error('启动语音识别失败:', e);
    if (e.message.includes('already started')) {
      showToast('语音识别已在运行中');
    } else {
      showToast('启动语音识别失败: ' + e.message);
    }
  }
}

function stopRecording() {
  isRecording = false;
  const voiceBtn = document.getElementById('voiceBtn');
  if (voiceBtn) {
    voiceBtn.classList.remove('recording');
    voiceBtn.querySelector('.voice-text').textContent = '语音输入';
    voiceBtn.querySelector('.voice-icon').textContent = '🎙️';
  }
  if (speechRecognition) {
    try {
      speechRecognition.stop();
    } catch (e) {
      console.log('停止语音识别:', e);
    }
  }
}

// 打开设置弹窗（全局函数）
function openSettingsModal() {
  const settingsModal = document.getElementById('settingsModal');
  const providerRadios = document.querySelectorAll('input[name="provider"]');
  const modelSelect = document.getElementById('modelSelect');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const baseUrlInput = document.getElementById('baseUrlInput');
  
  if (!settingsModal) return;
  
  // 恢复已保存的设置到 UI
  providerRadios.forEach(radio => {
    radio.checked = radio.value === aiSettings.provider;
  });
  
  // 更新模型选项显示
  const deepseekGroup = document.getElementById('deepseekModels');
  const openaiGroup = document.getElementById('openaiModels');
  const geminiGroup = document.getElementById('geminiModels');
  [deepseekGroup, openaiGroup, geminiGroup].forEach(g => {
    if (g) g.style.display = 'none';
  });
  if (aiSettings.provider === 'deepseek' && deepseekGroup) deepseekGroup.style.display = '';
  if (aiSettings.provider === 'openai' && openaiGroup) openaiGroup.style.display = '';
  if (aiSettings.provider === 'gemini' && geminiGroup) geminiGroup.style.display = '';
  
  modelSelect.value = aiSettings.model;
  apiKeyInput.value = aiSettings.apiKey;
  baseUrlInput.value = aiSettings.baseUrl || '';
  
  // 更新提示链接
  const apiKeyLink = document.getElementById('apiKeyLink');
  const modelHint = document.getElementById('modelHint');
  const config = API_CONFIG[aiSettings.provider];
  if (apiKeyLink) {
    apiKeyLink.href = config.keyLink;
    apiKeyLink.textContent = aiSettings.provider === 'deepseek' ? 'DeepSeek 控制台' :
                             aiSettings.provider === 'openai' ? 'OpenAI 控制台' : 'Google AI Studio';
  }
  if (modelHint) modelHint.textContent = config.hint;
  if (apiKeyInput) {
    apiKeyInput.placeholder = aiSettings.provider === 'deepseek' ? '可选，留空使用默认服务' :
                              `请输入你的 ${aiSettings.provider.toUpperCase()} API Key`;
  }
  
  settingsModal.style.display = 'flex';
}
window.openSettingsModal = openSettingsModal;

// ========== AI 设置模块 ==========

// 加载 AI 设置
function loadAISettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      aiSettings = JSON.parse(saved);
    }
  } catch (e) {
    console.error('加载 AI 设置失败:', e);
  }
}

// 保存 AI 设置
function saveAISettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(aiSettings));
  } catch (e) {
    console.error('保存 AI 设置失败:', e);
  }
}

// 初始化设置弹窗
function initSettingsModal() {
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const providerRadios = document.querySelectorAll('input[name="provider"]');
  const modelSelect = document.getElementById('modelSelect');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const toggleKeyBtn = document.getElementById('toggleKeyBtn');
  const apiKeyLink = document.getElementById('apiKeyLink');
  const apiKeyHint = document.getElementById('apiKeyHint');
  const modelHint = document.getElementById('modelHint');
  
  if (!settingsModal) {
    console.error('Settings modal not found');
    return;
  }
  
  // 关闭设置
  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
  
  settingsModal.querySelector('.modal-backdrop').addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
  
  // 切换服务商
  providerRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const provider = radio.value;
      updateModelOptions(provider);
      updateProviderUI(provider);
    });
  });
  
  // 切换密码可见性
  toggleKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleKeyBtn.textContent = '🙈';
    } else {
      apiKeyInput.type = 'password';
      toggleKeyBtn.textContent = '👁️';
    }
  });
  
  // 保存设置
  saveSettingsBtn.addEventListener('click', () => {
    const selectedProvider = document.querySelector('input[name="provider"]:checked').value;
    const selectedModel = modelSelect.value;
    const inputApiKey = apiKeyInput.value.trim();
    const inputBaseUrl = document.getElementById('baseUrlInput').value.trim();
    
    // 验证：非 DeepSeek 必须填写 API Key
    if (selectedProvider !== 'deepseek' && !inputApiKey) {
      showToast(`请输入 ${selectedProvider.toUpperCase()} 的 API Key`);
      apiKeyInput.focus();
      return;
    }
    
    aiSettings.provider = selectedProvider;
    aiSettings.model = selectedModel;
    aiSettings.apiKey = inputApiKey;
    aiSettings.baseUrl = inputBaseUrl;
    
    saveAISettings();
    settingsModal.style.display = 'none';
    showToast('AI 设置已保存 ✨');
  });
  
  // 更新模型选项
  function updateModelOptions(provider) {
    const deepseekGroup = document.getElementById('deepseekModels');
    const openaiGroup = document.getElementById('openaiModels');
    const geminiGroup = document.getElementById('geminiModels');
    
    // 隐藏所有
    [deepseekGroup, openaiGroup, geminiGroup].forEach(g => {
      if (g) g.style.display = 'none';
    });
    
    // 显示选中的
    let targetGroup;
    let defaultModel;
    if (provider === 'deepseek') {
      targetGroup = deepseekGroup;
      defaultModel = 'deepseek-chat';
    } else if (provider === 'openai') {
      targetGroup = openaiGroup;
      defaultModel = 'gpt-5.2';
    } else if (provider === 'gemini') {
      targetGroup = geminiGroup;
      defaultModel = 'gemini-3-flash-preview';
    }
    
    if (targetGroup) {
      targetGroup.style.display = '';
      modelSelect.value = defaultModel;
    }
  }
  
  // 更新服务商相关 UI
  function updateProviderUI(provider) {
    const config = API_CONFIG[provider];
    
    // 更新获取链接
    apiKeyLink.href = config.keyLink;
    apiKeyLink.textContent = provider === 'deepseek' ? 'DeepSeek 控制台' :
                             provider === 'openai' ? 'OpenAI 控制台' :
                             'Google AI Studio';
    
    // 更新提示
    modelHint.textContent = config.hint;
    
    // 更新占位符
    apiKeyInput.placeholder = provider === 'deepseek' ? '可选，留空使用默认服务' :
                              `请输入你的 ${provider.toUpperCase()} API Key`;
  }
}

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
  reunion: {
    title: '👥 重逢',
    meaning: '梦见已故的人或久别重逢通常反映了我们对他们的思念，或者他们在我们生命中的重要意义。这类梦也可能是潜意识在处理未完成的情感。',
    psychology: '故人在梦中说的话或做的事可能代表你内心的声音。这类梦有时是在帮助我们完成告别，有时是在提醒我们他们留给我们的人生智慧。',
    questions: [
      '梦中的人对你说了什么？做了什么？',
      '你和这个人之间有没有未完成的心愿或未说出的话？',
      '这个人给你最重要的影响是什么？'
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

// 梦境符号头像
const DREAM_AVATARS = ['🕊️', '🌙', '🔑', '🦋', '🌊', '⭐', '🌸', '🍃', '🔮', '💫', '🌈', '🦢', '🐚', '🎐', '🪷', '🌺'];

// 匿名昵称库
const ANONYMOUS_NAMES = [
  '星河漫步者', '月光收集者', '云端旅人', '深海潜行者', '时光漫步者',
  '梦境守护者', '黎明追寻者', '晚风倾听者', '极光观测者', '雨滴记录者',
  '落叶收藏家', '萤火追随者', '彩虹绘制者', '迷雾行者', '晨露拾遗者'
];

// 本地存储键名
const PLANET_FEED_KEY = 'dream_planet_feed';
const PLANET_RESONANCE_KEY = 'dream_planet_resonance';
const PLANET_COMMENTS_KEY = 'dream_planet_comments';

// 默认漂流瓶数据
const DEFAULT_FEED_DATA = [
  {
    id: 'default_1',
    avatar: '🦋',
    name: '匿名梦旅人',
    time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    content: '梦见自己在云端飞翔，俯瞰整座城市，感觉特别自由。醒来后心情很好，但也有点怅然若失...',
    tags: ['飞翔', '自由', '城市'],
    type: 'flying',
    resonance: 24
  },
  {
    id: 'default_2',
    avatar: '🌊',
    name: '深海潜行者',
    time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    content: '又梦见那片蔚蓝的海了，我在水下呼吸，看到五彩斑斓的珊瑚。奇怪的是完全不害怕，反而很平静。',
    tags: ['水', '海洋', '平静'],
    type: 'water',
    resonance: 18
  },
  {
    id: 'default_3',
    avatar: '👥',
    name: '时光漫步者',
    time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    content: '梦见了去世多年的外婆，她还是记忆中的样子，笑着给我做饭。醒来枕头湿了一片。',
    tags: ['重逢', '故人', '思念'],
    type: 'reunion',
    resonance: 56
  },
  {
    id: 'default_4',
    avatar: '🏃',
    name: '迷雾行者',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    content: '被什么东西追着跑，怎么也跑不快，腿像灌了铅。最后躲进一个房间才醒过来，心跳好快。',
    tags: ['追逐', '恐惧', '逃跑'],
    type: 'chasing',
    resonance: 31
  }
];

// 默认评论数据
const DEFAULT_COMMENTS_DATA = {
  'default_1': [
    {
      id: 'comment_default_1_1',
      avatar: '🌸',
      name: '云端旅人',
      time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      text: '我也经常梦见飞翔！每次醒来都特别不舍得'
    },
    {
      id: 'comment_default_1_2',
      avatar: '💫',
      name: '星河漫步者',
      time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      text: '飞翔的梦据说代表内心渴望自由，最近是不是压力比较大？'
    }
  ],
  'default_2': [
    {
      id: 'comment_default_2_1',
      avatar: '🦋',
      name: '晚风倾听者',
      time: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      text: '水下呼吸的梦好神奇，感觉很治愈'
    }
  ],
  'default_3': [
    {
      id: 'comment_default_3_1',
      avatar: '🌙',
      name: '梦境守护者',
      time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      text: '看哭了...我也经常梦见已故的亲人'
    },
    {
      id: 'comment_default_3_2',
      avatar: '🔮',
      name: '黎明追寻者',
      time: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      text: '这种梦是潜意识在帮我们完成告别，很珍贵的'
    },
    {
      id: 'comment_default_3_3',
      avatar: '⭐',
      name: '萤火追随者',
      time: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      text: '外婆做的饭，是记忆里最温暖的味道'
    }
  ],
  'default_4': [
    {
      id: 'comment_default_4_1',
      avatar: '🌊',
      name: '极光观测者',
      time: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      text: '被追的梦太真实了，腿真的像灌了铅一样跑不动'
    }
  ]
};

// 当前状态
let currentKeyword = 'all';
let currentCommentFeedId = null;
let cachedFeedData = null; // 缓存漂流瓶数据

// 从API获取漂流瓶数据
async function fetchFeedDataFromAPI(type = 'all') {
  try {
    const url = type === 'all' ? `${API_BASE}/dreams` : `${API_BASE}/dreams?type=${type}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('获取失败');
    const data = await response.json();
    // 转换为前端格式
    return data.map(d => ({
      id: d.id,
      avatar: d.user.avatar,
      name: d.user.nickname,
      time: d.createdAt,
      content: d.content,
      tags: d.tags,
      type: d.type,
      resonance: d.resonance,
      commentCount: d.commentCount || 0
    }));
  } catch (e) {
    console.error('从API获取漂流瓶失败:', e);
    return DEFAULT_FEED_DATA;
  }
}

// 获取漂流瓶数据（优先从缓存）
function getFeedData() {
  return cachedFeedData || DEFAULT_FEED_DATA;
}

// 刷新漂流瓶数据
async function refreshFeedData(type = 'all') {
  cachedFeedData = await fetchFeedDataFromAPI(type);
  return cachedFeedData;
}

// 发布漂流瓶到API
async function publishDreamToAPI(content, tags, type) {
  const user = getCurrentUser();
  if (!user) throw new Error('请先连接钱包');
  
  const response = await fetch(`${API_BASE}/dreams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: user.walletAddress,
      content,
      tags,
      type
    })
  });
  
  if (!response.ok) throw new Error('发布失败');
  return response.json();
}

// 从API获取评论
async function fetchCommentsFromAPI(dreamId) {
  try {
    const response = await fetch(`${API_BASE}/dreams/${dreamId}/comments`);
    if (!response.ok) throw new Error('获取评论失败');
    const data = await response.json();
    return data.map(c => ({
      id: c.id,
      avatar: c.user.avatar,
      name: c.user.nickname,
      time: c.createdAt,
      text: c.content
    }));
  } catch (e) {
    console.error('获取评论失败:', e);
    return [];
  }
}

// 发表评论到API
async function postCommentToAPI(dreamId, content) {
  const user = getCurrentUser();
  if (!user) throw new Error('请先连接钱包');
  
  const response = await fetch(`${API_BASE}/dreams/${dreamId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: user.walletAddress,
      content
    })
  });
  
  if (!response.ok) throw new Error('评论失败');
  return response.json();
}

// 切换共鸣状态
async function toggleResonanceAPI(dreamId) {
  const user = getCurrentUser();
  if (!user) throw new Error('请先连接钱包');
  
  const response = await fetch(`${API_BASE}/dreams/${dreamId}/resonance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: user.walletAddress
    })
  });
  
  if (!response.ok) throw new Error('操作失败');
  return response.json();
}

// 检查是否已共鸣
async function checkResonanceAPI(dreamId) {
  const user = getCurrentUser();
  if (!user) return false;
  
  try {
    const response = await fetch(`${API_BASE}/dreams/${dreamId}/resonance/${user.walletAddress}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.resonated;
  } catch {
    return false;
  }
}

// 保留本地存储函数作为降级方案
function getResonanceState() {
  try {
    const saved = localStorage.getItem(PLANET_RESONANCE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveResonanceState(state) {
  try {
    localStorage.setItem(PLANET_RESONANCE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('保存共鸣状态失败:', e);
  }
}

// 生成唯一ID
function generateId() {
  return 'feed_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 获取随机头像
function getRandomAvatar() {
  return DREAM_AVATARS[Math.floor(Math.random() * DREAM_AVATARS.length)];
}

// 获取随机昵称
function getRandomName() {
  return ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)];
}

// HTML 转义，防止 XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 格式化相对时间
function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

// 获取主题显示名
function getTypeLabel(type) {
  const labels = {
    flying: '飞翔', falling: '坠落', chasing: '追逐', reunion: '重逢',
    water: '水', lost: '迷路', exam: '考试', teeth: '牙齿'
  };
  return labels[type] || type;
}

// 获取主题图标
function getTypeIcon(type) {
  const icons = {
    flying: '🕊️', falling: '⬇️', chasing: '🏃', reunion: '👥',
    water: '🌊', lost: '🌀', exam: '📝', teeth: '🦷'
  };
  return icons[type] || '🌙';
}

// 初始化同梦星球模块
function initPlanetModule() {
  renderDreamers(currentKeyword);
  renderFeed(currentKeyword);
  renderInspirationCard(currentKeyword);
  initKeywordEvents();
  initFeedEvents();
  initPublishModal();
  initCommentModal();
  updateOnlineCount();
}

// 更新在线人数（模拟）
function updateOnlineCount() {
  const countEl = document.getElementById('planetOnlineCount');
  if (countEl) {
    const baseCount = 120 + Math.floor(Math.random() * 80);
    countEl.textContent = `${baseCount}人在线`;
  }
}

// 渲染同梦者列表
function renderDreamers(keyword) {
  const container = document.getElementById('dreamersScroll');
  if (!container) return;
  
  const feedData = getFeedData();
  
  // 从漂流瓶数据生成同梦者
  const dreamersMap = {};
  feedData.forEach(feed => {
    if (!dreamersMap[feed.type]) {
      dreamersMap[feed.type] = {
        avatar: getTypeIcon(feed.type),
        keyword: getTypeLabel(feed.type),
        time: formatRelativeTime(feed.time),
        type: feed.type,
        feedId: feed.id
      };
    }
  });
  
  let dreamers = Object.values(dreamersMap);
  
  if (keyword !== 'all') {
    dreamers = dreamers.filter(d => d.type === keyword);
  }
  
  if (dreamers.length === 0) {
    container.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; padding: 10px;">暂无同梦者</p>';
    return;
  }
  
  container.innerHTML = dreamers.map(dreamer => `
    <div class="dreamer-card has-content" data-type="${dreamer.type}" data-feed-id="${dreamer.feedId}">
      <div class="dreamer-avatar">${dreamer.avatar}</div>
      <div class="dreamer-keyword">${dreamer.keyword}</div>
      <div class="dreamer-time">${dreamer.time}</div>
    </div>
  `).join('');
  
  // 点击同梦者卡片筛选
  container.querySelectorAll('.dreamer-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.type;
      const keywordBtns = document.querySelectorAll('.keyword-btn');
      keywordBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.keyword === type);
      });
      currentKeyword = type;
      renderFeed(type);
      renderInspirationCard(type);
    });
  });
}

// 渲染漂流瓶（异步版本）
async function renderFeed(keyword) {
  const container = document.getElementById('feedList');
  if (!container) return;
  
  // 显示加载状态
  container.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; text-align: center; padding: 20px;">加载中...</p>';
  
  // 从 API 获取数据
  const feedData = await refreshFeedData(keyword);
  const resonanceState = getResonanceState();
  
  let filtered = keyword === 'all' ? feedData : feedData.filter(f => f.type === keyword);
  
  // 按时间排序（新的在前）
  filtered.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  if (filtered.length === 0) {
    container.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 13px; text-align: center; padding: 20px;">这片星空暂时没有漂流瓶...</p>';
    return;
  }
  
  container.innerHTML = filtered.map(item => {
    const isResonated = resonanceState[item.id] === true;
    
    return `
    <div class="feed-item" data-id="${item.id}">
      <div class="feed-header">
        <div class="feed-avatar">${item.avatar}</div>
        <div class="feed-info">
          <div class="feed-name">${item.name}</div>
          <div class="feed-meta">${formatRelativeTime(item.time)}</div>
        </div>
      </div>
      <div class="feed-content">${escapeHtml(item.content.length > 60 ? item.content.substring(0, 60) + '...' : item.content)}</div>
      <div class="feed-tags">
        ${item.tags.slice(0, 3).map(tag => `<span class="feed-tag">#${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="feed-actions">
        <button class="feed-action resonate-btn ${isResonated ? 'resonated' : ''}" data-id="${item.id}">
          <span>💫</span>
          <span>共鸣 ${item.resonance}</span>
        </button>
        <button class="feed-action comment-btn" data-id="${item.id}">
          <span>💭</span>
          <span>感受 ${item.commentCount || 0}</span>
        </button>
      </div>
    </div>
  `;
  }).join('');
}

// 渲染灵感卡片
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
    // 共鸣按钮
    const resonateBtn = e.target.closest('.resonate-btn');
    if (resonateBtn) {
      e.stopPropagation();
      handleResonate(resonateBtn);
      return;
    }
    
    // 评论按钮
    const commentBtn = e.target.closest('.comment-btn');
    if (commentBtn) {
      e.stopPropagation();
      const feedId = commentBtn.dataset.id;
      openCommentModal(feedId);
      return;
    }
    
    // 点击漂流瓶卡片
    const feedItem = e.target.closest('.feed-item');
    if (feedItem) {
      const feedId = feedItem.dataset.id;
      openDreamDetail(feedId);
    }
  });
  
  // 发布按钮
  const shareBtn = document.getElementById('shareDreamBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      openPublishModal();
    });
  }
  
  // 加载更多
  const loadMoreBtn = document.getElementById('loadMoreFeed');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      showToast('已显示全部梦境');
    });
  }
}

// 处理共鸣
async function handleResonate(btn) {
  const feedId = btn.dataset.id;
  
  // 检查是否登录
  if (!isLoggedIn()) {
    showToast('请先连接钱包');
    return;
  }
  
  const wasResonated = btn.classList.contains('resonated');
  
  // 先更新UI
  if (wasResonated) {
    btn.classList.remove('resonated');
  } else {
    btn.classList.add('resonated');
  }
  
  try {
    // 调用API
    const result = await toggleResonanceAPI(feedId);
    
    if (result && result.success !== false) {
      // API成功，更新显示
      const count = result.count !== undefined ? result.count : (result.resonance || 0);
      btn.querySelector('span:last-child').textContent = `共鸣 ${count}`;
      if (result.resonated || result.action === 'added') {
        btn.classList.add('resonated');
      } else {
        btn.classList.remove('resonated');
      }
      // 更新缓存
      if (cachedFeedData) {
        const feed = cachedFeedData.find(f => String(f.id) === String(feedId));
        if (feed) {
          feed.resonance = count;
        }
      }
    } else {
      throw new Error('操作失败');
    }
  } catch (error) {
    console.error('共鸣操作失败:', error);
    // API失败，回滚UI
    if (wasResonated) {
      btn.classList.add('resonated');
    } else {
      btn.classList.remove('resonated');
    }
    showToast('操作失败，请稍后再试');
  }
}

// 打开发布弹窗
function openPublishModal() {
  // 检查是否已登录
  if (!isLoggedIn()) {
    showToast('请先连接钱包');
    return;
  }
  
  const modal = document.getElementById('publishModal');
  if (!modal) return;
  
  // 重置表单
  document.getElementById('publishDreamInput').value = '';
  document.getElementById('publishCustomTags').value = '';
  document.querySelectorAll('.publish-tag').forEach(t => t.classList.remove('active'));
  
  modal.style.display = 'flex';
}

// 初始化发布弹窗
function initPublishModal() {
  const modal = document.getElementById('publishModal');
  if (!modal) return;
  
  const closeBtn = document.getElementById('closePublishBtn');
  const submitBtn = document.getElementById('submitPublishBtn');
  const publishTags = document.getElementById('publishTags');
  
  // 关闭
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  modal.querySelector('.modal-backdrop').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // 主题选择（单选）
  publishTags.addEventListener('click', (e) => {
    const tag = e.target.closest('.publish-tag');
    if (tag) {
      document.querySelectorAll('.publish-tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
    }
  });
  
  // 提交
  submitBtn.addEventListener('click', async () => {
    const content = document.getElementById('publishDreamInput').value.trim();
    const customTags = document.getElementById('publishCustomTags').value.trim();
    const activeType = document.querySelector('.publish-tag.active');
    
    if (!content) {
      showToast('请描述你的梦境');
      return;
    }
    
    if (!activeType) {
      showToast('请选择梦境主题');
      return;
    }
    
    const type = activeType.dataset.type;
    
    // 处理标签
    let tags = [getTypeLabel(type)];
    if (customTags) {
      const extraTags = customTags.split(/\s+/).filter(t => t).slice(0, 3);
      tags = tags.concat(extraTags);
    }
    
    try {
      // 调用 API 发布
      await publishDreamToAPI(content, tags, type);
      
      // 刷新显示
      renderDreamers(currentKeyword);
      await renderFeed(currentKeyword);
      
      // 关闭弹窗
      modal.style.display = 'none';
      showToast('漂流瓶已投放 ✨');
    } catch (error) {
      console.error('发布失败:', error);
      showToast(error.message || '发布失败，请稍后重试');
    }
  });
}

// 打开评论弹窗
async function openCommentModal(feedId) {
  const modal = document.getElementById('commentModal');
  if (!modal) return;
  
  currentCommentFeedId = feedId;
  
  // 确保缓存数据已加载
  let feedData = getFeedData();
  if (!feedData || feedData.length === 0 || feedData === DEFAULT_FEED_DATA) {
    feedData = await refreshFeedData();
  }
  
  const feed = feedData.find(f => String(f.id) === String(feedId));
  if (!feed) {
    console.error('未找到梦境, feedId:', feedId, 'feedData:', feedData);
    showToast('梦境不存在');
    return;
  }
  
  // 显示梦境预览
  document.getElementById('commentDreamPreview').textContent = feed.content;
  
  // 渲染评论
  renderComments(feedId);
  
  // 清空输入
  document.getElementById('commentInput').value = '';
  
  modal.style.display = 'flex';
}

// 渲染评论（异步版本）
async function renderComments(feedId) {
  const container = document.getElementById('commentList');
  if (!container) return;
  
  container.innerHTML = '<p class="comment-empty">加载中...</p>';
  
  // 从 API 获取评论
  const comments = await fetchCommentsFromAPI(feedId);
  
  if (comments.length === 0) {
    container.innerHTML = '<p class="comment-empty">还没有人分享感受，来说点什么吧~</p>';
    return;
  }
  
  container.innerHTML = comments.map(comment => `
    <div class="comment-item">
      <div class="comment-avatar">${comment.avatar}</div>
      <div class="comment-body">
        <div class="comment-meta">
          <span class="comment-name">${escapeHtml(comment.name)}</span>
          <span class="comment-time">${formatRelativeTime(comment.time)}</span>
        </div>
        <div class="comment-text">${escapeHtml(comment.text)}</div>
      </div>
    </div>
  `).join('');
  
  // 滚动到底部
  container.scrollTop = container.scrollHeight;
}

// 初始化评论弹窗
function initCommentModal() {
  const modal = document.getElementById('commentModal');
  if (!modal) return;
  
  const closeBtn = document.getElementById('closeCommentBtn');
  const submitBtn = document.getElementById('submitCommentBtn');
  const commentInput = document.getElementById('commentInput');
  
  // 关闭
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    currentCommentFeedId = null;
  });
  
  modal.querySelector('.modal-backdrop').addEventListener('click', () => {
    modal.style.display = 'none';
    currentCommentFeedId = null;
  });
  
  // 提交评论
  submitBtn.addEventListener('click', async () => {
    // 检查是否已登录
    if (!isLoggedIn()) {
      showToast('请先连接钱包');
      return;
    }
    
    const text = commentInput.value.trim();
    if (!text) {
      showToast('请写下你的感受');
      return;
    }
    
    if (!currentCommentFeedId) return;
    
    try {
      // 调用 API 发表评论
      await postCommentToAPI(currentCommentFeedId, text);
      
      // 刷新评论
      await renderComments(currentCommentFeedId);
      
      // 清空输入
      commentInput.value = '';
      showToast('感受已发送 💭');
    } catch (error) {
      console.error('评论失败:', error);
      showToast(error.message || '评论失败，请稍后重试');
    }
  });
}

// 打开梦境详情
function openDreamDetail(feedId) {
  const modal = document.getElementById('dreamDetailModal');
  if (!modal) return;
  
  const feedData = getFeedData();
  const feed = feedData.find(f => f.id === feedId);
  if (!feed) return;
  
  const resonanceState = getResonanceState();
  const isResonated = resonanceState[feedId] === true;
  
  // 填充内容
  document.getElementById('detailAvatar').textContent = feed.avatar;
  document.getElementById('detailName').textContent = feed.name;
  document.getElementById('detailTime').textContent = formatRelativeTime(feed.time);
  document.getElementById('detailContent').textContent = feed.content;
  document.getElementById('detailTags').innerHTML = feed.tags.map(tag => 
    `<span class="feed-tag">#${escapeHtml(tag)}</span>`
  ).join('');
  
  // 共鸣按钮
  const resonateBtn = document.getElementById('detailResonateBtn');
  resonateBtn.className = `feed-action resonate-btn ${isResonated ? 'resonated' : ''}`;
  resonateBtn.dataset.id = feedId;
  document.getElementById('detailResonateCount').textContent = `共鸣 ${feed.resonance}`;
  
  // 评论按钮
  document.getElementById('detailCommentBtn').dataset.id = feedId;
  
  // 绑定事件
  resonateBtn.onclick = () => {
    handleResonate(resonateBtn);
    // 重新读取最新数据
    const updatedFeed = getFeedData().find(f => f.id === feedId);
    if (updatedFeed) {
      document.getElementById('detailResonateCount').textContent = `共鸣 ${updatedFeed.resonance}`;
    }
  };
  
  document.getElementById('detailCommentBtn').onclick = () => {
    modal.style.display = 'none';
    openCommentModal(feedId);
  };
  
  // 关闭
  document.getElementById('closeDreamDetailBtn').onclick = () => {
    modal.style.display = 'none';
  };
  
  modal.querySelector('.modal-backdrop').onclick = () => {
    modal.style.display = 'none';
  };
  
  modal.style.display = 'flex';
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initPlanetModule, 500);
  initWalletModule();
});

// ========== 钱包与用户模块 ==========

// API 地址：使用相对路径，通过 Nginx 反向代理
const API_BASE = '/api';
const USER_STORAGE_KEY = 'dream_user';

// 当前用户状态
let currentUser = null;
let selectedAvatar = '🌙';

// 初始化钱包模块
function initWalletModule() {
  // 检查本地存储的用户信息
  loadUserFromStorage();
  
  // 初始化钱包选择弹窗
  initWalletSelectModal();
  
  // 初始化用户资料弹窗
  initProfileModal();
  
  // 更新钱包按钮状态
  updateWalletButton();
}

// 从本地存储加载用户
function loadUserFromStorage() {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
      currentUser = JSON.parse(saved);
      updateWalletButton();
    }
  } catch (e) {
    console.error('加载用户信息失败:', e);
  }
}

// 保存用户到本地存储
function saveUserToStorage(user) {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('保存用户信息失败:', e);
  }
}

// 清除本地用户信息
function clearUserFromStorage() {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (e) {
    console.error('清除用户信息失败:', e);
  }
}

// 更新钱包按钮显示
function updateWalletButton() {
  const walletBtn = document.getElementById('walletBtn');
  if (!walletBtn) return;
  
  if (currentUser) {
    walletBtn.classList.add('connected');
    walletBtn.innerHTML = `
      <span class="nav-icon wallet-avatar">${currentUser.avatar}</span>
      <span class="nav-text wallet-text">${currentUser.nickname}</span>
    `;
  } else {
    walletBtn.classList.remove('connected');
    walletBtn.innerHTML = `
      <span class="nav-icon wallet-icon">🔗</span>
      <span class="nav-text wallet-text">连接钱包</span>
    `;
  }
}

// 处理钱包按钮点击
async function handleWalletClick() {
  if (currentUser) {
    // 已登录，打开用户资料弹窗
    openProfileModal();
  } else {
    // 未登录，打开钱包选择弹窗
    openWalletModal();
  }
}
window.handleWalletClick = handleWalletClick;

// 钱包配置
const WALLET_CONFIG = {
  metamask: {
    name: 'MetaMask',
    icon: '🦊',
    check: () => window.ethereum?.isMetaMask,
    provider: () => window.ethereum
  },
  okx: {
    name: 'OKX Wallet',
    icon: '⭕',
    check: () => window.okxwallet,
    provider: () => window.okxwallet
  },
  coinbase: {
    name: 'Coinbase Wallet',
    icon: '🔵',
    check: () => window.ethereum?.isCoinbaseWallet || window.coinbaseWalletExtension,
    provider: () => window.coinbaseWalletExtension || window.ethereum
  },
  bitget: {
    name: 'Bitget Wallet',
    icon: '🟦',
    check: () => window.bitkeep?.ethereum,
    provider: () => window.bitkeep?.ethereum
  },
  tokenpocket: {
    name: 'TokenPocket',
    icon: '🟣',
    check: () => window.ethereum?.isTokenPocket,
    provider: () => window.ethereum
  },
  trust: {
    name: 'Trust Wallet',
    icon: '🛡️',
    check: () => window.ethereum?.isTrust || window.trustwallet,
    provider: () => window.trustwallet || window.ethereum
  },
  phantom: {
    name: 'Phantom',
    icon: '👻',
    check: () => window.phantom?.ethereum,
    provider: () => window.phantom?.ethereum
  },
  generic: {
    name: '其他钱包',
    icon: '🔗',
    check: () => window.ethereum,
    provider: () => window.ethereum
  }
};

// 打开钱包选择弹窗
function openWalletModal() {
  const modal = document.getElementById('walletSelectModal');
  if (!modal) return;
  
  const walletList = document.getElementById('walletList');
  
  // 检测可用钱包
  const availableWallets = [];
  const unavailableWallets = [];
  
  for (const [key, config] of Object.entries(WALLET_CONFIG)) {
    if (key === 'generic') continue; // 最后处理通用钱包
    const wallet = { key, ...config, available: config.check() };
    if (wallet.available) {
      availableWallets.push(wallet);
    } else {
      unavailableWallets.push(wallet);
    }
  }
  
  // 如果有ethereum但没识别出具体钱包，显示通用选项
  if (availableWallets.length === 0 && window.ethereum) {
    availableWallets.push({ key: 'generic', ...WALLET_CONFIG.generic, available: true });
  }
  
  // 渲染钱包列表
  walletList.innerHTML = `
    ${availableWallets.length > 0 ? `
      <div class="wallet-section-title">已安装</div>
      ${availableWallets.map(w => `
        <button class="wallet-option available" data-wallet="${w.key}">
          <span class="wallet-option-icon">${w.icon}</span>
          <span class="wallet-option-name">${w.name}</span>
          <span class="wallet-option-status">可连接</span>
        </button>
      `).join('')}
    ` : ''}
    ${unavailableWallets.length > 0 ? `
      <div class="wallet-section-title">未检测到</div>
      ${unavailableWallets.map(w => `
        <button class="wallet-option unavailable" data-wallet="${w.key}" disabled>
          <span class="wallet-option-icon">${w.icon}</span>
          <span class="wallet-option-name">${w.name}</span>
          <span class="wallet-option-status">未安装</span>
        </button>
      `).join('')}
    ` : ''}
    ${availableWallets.length === 0 && !window.ethereum ? `
      <div class="wallet-empty">
        <p>未检测到任何钱包</p>
        <p class="wallet-empty-hint">请安装 MetaMask 或其他 Web3 钱包</p>
      </div>
    ` : ''}
  `;
  
  modal.style.display = 'flex';
}

// 初始化钱包选择弹窗
function initWalletSelectModal() {
  const modal = document.getElementById('walletSelectModal');
  if (!modal) return;
  
  const closeBtn = document.getElementById('closeWalletSelectBtn');
  const walletList = document.getElementById('walletList');
  
  // 关闭弹窗
  closeBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  modal.querySelector('.modal-backdrop')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // 钱包选择
  walletList?.addEventListener('click', async (e) => {
    const option = e.target.closest('.wallet-option.available');
    if (!option) return;
    
    const walletKey = option.dataset.wallet;
    modal.style.display = 'none';
    await connectWallet(walletKey);
  });
}

// BSC 主网配置
const BSC_CHAIN_CONFIG = {
  chainId: '0x38', // 56 in hex
  chainName: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com/']
};

// 切换到 BSC 主网
async function switchToBSC(provider) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BSC_CHAIN_CONFIG.chainId }]
    });
    return true;
  } catch (switchError) {
    // 如果链不存在，添加它
    if (switchError.code === 4902) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [BSC_CHAIN_CONFIG]
        });
        return true;
      } catch (addError) {
        console.error('添加 BSC 网络失败:', addError);
        return false;
      }
    }
    console.error('切换网络失败:', switchError);
    return false;
  }
}

// 连接钱包
async function connectWallet(walletKey = 'generic') {
  const config = WALLET_CONFIG[walletKey];
  if (!config) {
    showToast('不支持的钱包类型');
    return;
  }
  
  const provider = config.provider();
  if (!provider) {
    showToast(`请先安装 ${config.name}`);
    return;
  }
  
  try {
    showToast(`正在连接 ${config.name}...`);
    
    // 请求连接钱包
    const accounts = await provider.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (accounts.length === 0) {
      showToast('未获取到钱包地址');
      return;
    }
    
    // 切换到 BSC 主网
    showToast('正在切换到 BSC 主网...');
    const switched = await switchToBSC(provider);
    if (!switched) {
      showToast('切换到 BSC 网络失败，请手动切换');
    }
    
    const walletAddress = accounts[0].toLowerCase();
    console.log('钱包已连接:', walletAddress, '类型:', config.name);
    
    // 调用后端 API 登录/注册
    try {
      const response = await fetch(`${API_BASE}/auth/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, walletType: walletKey })
      });
      
      if (!response.ok) {
        throw new Error('服务器错误');
      }
      
      const data = await response.json();
      
      if (data.success) {
        currentUser = data.user;
        currentUser.walletType = walletKey;
        saveUserToStorage(currentUser);
        updateWalletButton();
        
        if (data.isNew) {
          showToast('注册成功！点击头像可以修改资料');
          setTimeout(() => openProfileModal(), 500);
        } else {
          showToast(`欢迎回来，${currentUser.nickname}`);
        }
      }
    } catch (apiError) {
      console.error('API 调用失败，使用本地模式:', apiError);
      // 后端不可用时使用本地模式
      currentUser = {
        walletAddress: walletAddress,
        nickname: '梦旅人_' + walletAddress.slice(-4),
        avatar: '🌙',
        walletType: walletKey
      };
      saveUserToStorage(currentUser);
      updateWalletButton();
      showToast('钱包已连接（本地模式）');
    }
  } catch (error) {
    console.error('连接钱包失败:', error);
    if (error.code === 4001) {
      showToast('您取消了钱包连接');
    } else {
      showToast('连接钱包失败: ' + (error.message || '未知错误'));
    }
  }
}

// 打开用户资料弹窗
function openProfileModal() {
  const modal = document.getElementById('profileModal');
  if (!modal || !currentUser) return;
  
  // 填充当前用户信息
  document.getElementById('profileWalletAddress').textContent = currentUser.walletAddress;
  document.getElementById('profileNickname').value = currentUser.nickname || '';
  
  // 设置当前头像选中状态
  selectedAvatar = currentUser.avatar || '🌙';
  document.querySelectorAll('.avatar-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.avatar === selectedAvatar);
  });
  
  modal.style.display = 'flex';
}

// 初始化用户资料弹窗
function initProfileModal() {
  const modal = document.getElementById('profileModal');
  if (!modal) return;
  
  const closeBtn = document.getElementById('closeProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const avatarPicker = document.getElementById('avatarPicker');
  
  // 关闭弹窗
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  modal.querySelector('.modal-backdrop').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // 头像选择
  avatarPicker.addEventListener('click', (e) => {
    const option = e.target.closest('.avatar-option');
    if (option) {
      document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      selectedAvatar = option.dataset.avatar;
    }
  });
  
  // 保存资料
  saveBtn.addEventListener('click', async () => {
    const nickname = document.getElementById('profileNickname').value.trim();
    
    if (!nickname) {
      showToast('请输入昵称');
      return;
    }
    
    if (!currentUser) return;
    
    // 确保地址是小写的
    const walletAddress = currentUser.walletAddress.toLowerCase();
    
    try {
      const response = await fetch(`${API_BASE}/user/${walletAddress}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname,
          avatar: selectedAvatar
        })
      });
      
      if (!response.ok) {
        throw new Error('更新失败');
      }
      
      const data = await response.json();
      
      if (data.success) {
        currentUser = data.user;
        currentUser.walletType = currentUser.walletType || 'generic';
        saveUserToStorage(currentUser);
        updateWalletButton();
        modal.style.display = 'none';
        showToast('资料已更新');
      }
    } catch (error) {
      console.error('更新资料失败，使用本地模式:', error);
      // 后端不可用时使用本地模式保存
      currentUser.nickname = nickname;
      currentUser.avatar = selectedAvatar;
      currentUser.walletAddress = walletAddress;
      saveUserToStorage(currentUser);
      updateWalletButton();
      modal.style.display = 'none';
      showToast('资料已更新（本地模式）');
    }
  });
  
  // 断开连接
  logoutBtn.addEventListener('click', () => {
    currentUser = null;
    clearUserFromStorage();
    updateWalletButton();
    modal.style.display = 'none';
    showToast('已断开钱包连接');
  });
}

// 检查是否已登录
function isLoggedIn() {
  return currentUser !== null;
}

// 获取当前用户
function getCurrentUser() {
  return currentUser;
}

// 暴露到全局
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;

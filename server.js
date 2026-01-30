const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 初始化 SQLite 数据库
const db = new sqlite3.Database('./dreamwhisper.db', (err) => {
  if (err) {
    console.error('数据库连接失败:', err);
  } else {
    console.log('数据库连接成功');
    initDatabase();
  }
});

// 初始化数据库表
function initDatabase() {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT UNIQUE NOT NULL,
      nickname TEXT DEFAULT '匿名梦旅人',
      avatar TEXT DEFAULT '🌙',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 漂流瓶表
  db.run(`
    CREATE TABLE IF NOT EXISTS dreams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      content TEXT NOT NULL,
      tags TEXT,
      type TEXT,
      resonance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 评论表
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dream_id INTEGER,
      user_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dream_id) REFERENCES dreams(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 共鸣记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS resonances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dream_id INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(dream_id, user_id),
      FOREIGN KEY (dream_id) REFERENCES dreams(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('数据库表初始化完成');
}

// ========== 用户相关 API ==========

// 钱包登录/注册
app.post('/api/auth/wallet', (req, res) => {
  const { walletAddress } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({ error: '钱包地址不能为空' });
  }

  const address = walletAddress.toLowerCase();

  // 查找用户是否存在
  db.get('SELECT * FROM users WHERE wallet_address = ?', [address], (err, user) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }

    if (user) {
      // 用户已存在，返回用户信息
      res.json({ 
        success: true, 
        isNew: false,
        user: {
          id: user.id,
          walletAddress: user.wallet_address,
          nickname: user.nickname,
          avatar: user.avatar
        }
      });
    } else {
      // 新用户，创建账号
      const defaultNickname = '梦旅人_' + address.slice(-6);
      const defaultAvatar = getRandomAvatar();
      
      db.run(
        'INSERT INTO users (wallet_address, nickname, avatar) VALUES (?, ?, ?)',
        [address, defaultNickname, defaultAvatar],
        function(err) {
          if (err) {
            return res.status(500).json({ error: '创建用户失败' });
          }
          res.json({
            success: true,
            isNew: true,
            user: {
              id: this.lastID,
              walletAddress: address,
              nickname: defaultNickname,
              avatar: defaultAvatar
            }
          });
        }
      );
    }
  });
});

// 获取用户信息
app.get('/api/user/:walletAddress', (req, res) => {
  const address = req.params.walletAddress.toLowerCase();
  
  db.get('SELECT * FROM users WHERE wallet_address = ?', [address], (err, user) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({
      id: user.id,
      walletAddress: user.wallet_address,
      nickname: user.nickname,
      avatar: user.avatar
    });
  });
});

// 更新用户资料
app.put('/api/user/:walletAddress', (req, res) => {
  const address = req.params.walletAddress.toLowerCase();
  const { nickname, avatar } = req.body;

  if (!nickname && !avatar) {
    return res.status(400).json({ error: '请提供要更新的字段' });
  }

  let sql = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
  const params = [];

  if (nickname) {
    sql += ', nickname = ?';
    params.push(nickname);
  }
  if (avatar) {
    sql += ', avatar = ?';
    params.push(avatar);
  }

  sql += ' WHERE wallet_address = ?';
  params.push(address);

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ error: '更新失败' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 返回更新后的用户信息
    db.get('SELECT * FROM users WHERE wallet_address = ?', [address], (err, user) => {
      if (err || !user) {
        return res.status(500).json({ error: '获取用户信息失败' });
      }
      res.json({
        success: true,
        user: {
          id: user.id,
          walletAddress: user.wallet_address,
          nickname: user.nickname,
          avatar: user.avatar
        }
      });
    });
  });
});

// ========== 漂流瓶相关 API ==========

// 获取漂流瓶列表
app.get('/api/dreams', (req, res) => {
  const { type, limit = 50 } = req.query;
  
  let sql = `
    SELECT d.*, u.nickname, u.avatar, u.wallet_address,
           (SELECT COUNT(*) FROM comments WHERE dream_id = d.id) as comment_count
    FROM dreams d
    LEFT JOIN users u ON d.user_id = u.id
  `;
  const params = [];

  if (type && type !== 'all') {
    sql += ' WHERE d.type = ?';
    params.push(type);
  }

  sql += ' ORDER BY d.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(sql, params, (err, dreams) => {
    if (err) {
      return res.status(500).json({ error: '获取漂流瓶失败' });
    }
    
    const result = dreams.map(d => ({
      id: d.id,
      content: d.content,
      tags: d.tags ? JSON.parse(d.tags) : [],
      type: d.type,
      resonance: d.resonance,
      commentCount: d.comment_count || 0,
      createdAt: d.created_at,
      user: {
        nickname: d.nickname || '匿名梦旅人',
        avatar: d.avatar || '🌙',
        walletAddress: d.wallet_address
      }
    }));
    
    res.json(result);
  });
});

// 发布漂流瓶
app.post('/api/dreams', (req, res) => {
  const { walletAddress, content, tags, type } = req.body;

  if (!walletAddress) {
    return res.status(401).json({ error: '请先连接钱包' });
  }
  if (!content) {
    return res.status(400).json({ error: '内容不能为空' });
  }

  const address = walletAddress.toLowerCase();

  // 获取用户ID
  db.get('SELECT id FROM users WHERE wallet_address = ?', [address], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: '用户不存在，请先连接钱包' });
    }

    db.run(
      'INSERT INTO dreams (user_id, content, tags, type) VALUES (?, ?, ?, ?)',
      [user.id, content, JSON.stringify(tags || []), type],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '发布失败' });
        }
        res.json({
          success: true,
          dreamId: this.lastID
        });
      }
    );
  });
});

// ========== 评论相关 API ==========

// 获取评论列表
app.get('/api/dreams/:dreamId/comments', (req, res) => {
  const dreamId = req.params.dreamId;

  db.all(`
    SELECT c.*, u.nickname, u.avatar
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.dream_id = ?
    ORDER BY c.created_at ASC
  `, [dreamId], (err, comments) => {
    if (err) {
      return res.status(500).json({ error: '获取评论失败' });
    }
    
    const result = comments.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      user: {
        nickname: c.nickname || '匿名梦旅人',
        avatar: c.avatar || '🌙'
      }
    }));
    
    res.json(result);
  });
});

// 发表评论
app.post('/api/dreams/:dreamId/comments', (req, res) => {
  const dreamId = req.params.dreamId;
  const { walletAddress, content } = req.body;

  if (!walletAddress) {
    return res.status(401).json({ error: '请先连接钱包' });
  }
  if (!content) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  const address = walletAddress.toLowerCase();

  db.get('SELECT id FROM users WHERE wallet_address = ?', [address], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    db.run(
      'INSERT INTO comments (dream_id, user_id, content) VALUES (?, ?, ?)',
      [dreamId, user.id, content],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '评论失败' });
        }
        
        // 返回新评论信息
        db.get(`
          SELECT c.*, u.nickname, u.avatar
          FROM comments c
          LEFT JOIN users u ON c.user_id = u.id
          WHERE c.id = ?
        `, [this.lastID], (err, comment) => {
          if (err || !comment) {
            return res.json({ success: true, commentId: this.lastID });
          }
          res.json({
            success: true,
            comment: {
              id: comment.id,
              content: comment.content,
              createdAt: comment.created_at,
              user: {
                nickname: comment.nickname,
                avatar: comment.avatar
              }
            }
          });
        });
      }
    );
  });
});

// ========== 共鸣相关 API ==========

// 切换共鸣状态
app.post('/api/dreams/:dreamId/resonance', (req, res) => {
  const dreamId = req.params.dreamId;
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(401).json({ error: '请先连接钱包' });
  }

  const address = walletAddress.toLowerCase();

  db.get('SELECT id FROM users WHERE wallet_address = ?', [address], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // 检查是否已共鸣
    db.get(
      'SELECT id FROM resonances WHERE dream_id = ? AND user_id = ?',
      [dreamId, user.id],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }

        if (existing) {
          // 取消共鸣
          db.run('DELETE FROM resonances WHERE id = ?', [existing.id], (err) => {
            if (err) {
              return res.status(500).json({ error: '操作失败' });
            }
            db.run('UPDATE dreams SET resonance = resonance - 1 WHERE id = ?', [dreamId], function() {
              // 获取最新的共鸣数
              db.get('SELECT resonance FROM dreams WHERE id = ?', [dreamId], (err, dream) => {
                const count = dream ? dream.resonance : 0;
                res.json({ success: true, action: 'removed', count: count, resonated: false });
              });
            });
          });
        } else {
          // 添加共鸣
          db.run(
            'INSERT INTO resonances (dream_id, user_id) VALUES (?, ?)',
            [dreamId, user.id],
            (err) => {
              if (err) {
                return res.status(500).json({ error: '操作失败' });
              }
              db.run('UPDATE dreams SET resonance = resonance + 1 WHERE id = ?', [dreamId], function() {
                // 获取最新的共鸣数
                db.get('SELECT resonance FROM dreams WHERE id = ?', [dreamId], (err, dream) => {
                  const count = dream ? dream.resonance : 0;
                  res.json({ success: true, action: 'added', count: count, resonated: true });
                });
              });
            }
          );
        }
      }
    );
  });
});

// 检查用户是否已共鸣
app.get('/api/dreams/:dreamId/resonance/:walletAddress', (req, res) => {
  const dreamId = req.params.dreamId;
  const address = req.params.walletAddress.toLowerCase();

  db.get('SELECT id FROM users WHERE wallet_address = ?', [address], (err, user) => {
    if (err || !user) {
      return res.json({ resonated: false });
    }

    db.get(
      'SELECT id FROM resonances WHERE dream_id = ? AND user_id = ?',
      [dreamId, user.id],
      (err, existing) => {
        res.json({ resonated: !!existing });
      }
    );
  });
});

// 辅助函数
function getRandomAvatar() {
  const avatars = ['🕊️', '🌙', '🔑', '🦋', '🌊', '⭐', '🌸', '🍃', '🔮', '💫', '🌈', '🦢', '🐚', '🎐', '🪷', '🌺'];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('关闭数据库失败:', err);
    } else {
      console.log('数据库已关闭');
    }
    process.exit(0);
  });
});

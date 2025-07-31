import { Browser, BrowserContext, Page, chromium } from 'playwright';

// Interfaces for type safety
interface Credentials {
  username: string;
  password: string;
}

interface AutomationConfig {
  website: string;
  credentials: Credentials;
  settings: {
    headless: boolean;
    slowMo: number;
    timeout: number;
    screenshotPath: string;
    errorScreenshotPath: string;
  };
}

interface TopicInfo {
  title: string;
  author: string;
  url: string;
  category: string;
  tags: string[];
}

interface AutomationResult {
  success: boolean;
  message: string;
  topicInfo?: TopicInfo;
  screenshotPath?: string;
  error?: Error;
}

class ISharkFlyAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  
  constructor(private config: AutomationConfig) {}

  async initialize(): Promise<void> {
    console.log('🚀 Initializing browser...');
    this.browser = await chromium.launch({
      headless: this.config.settings.headless,
      slowMo: this.config.settings.slowMo
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    this.page = await this.context.newPage();
    
    // Set default timeout
    this.page.setDefaultTimeout(this.config.settings.timeout);
    
    console.log('✅ Browser initialized successfully');
  }

  async navigateToWebsite(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log(`🌐 Navigating to ${this.config.website}...`);
    await this.page.goto(this.config.website);
    await this.page.waitForLoadState('networkidle');
    console.log('✅ Website loaded successfully');
  }

  async performLogin(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔐 Starting login process...');
    
    // Click Log In button
    await this.page.getByRole('button', { name: 'Log In' }).click();
    await this.page.waitForLoadState('networkidle');
    console.log('✅ Login page loaded');

    // Fill credentials
    await this.page.getByRole('textbox', { name: 'Email / Username' }).fill(this.config.credentials.username);
    console.log('✅ Username entered');
    
    await this.page.getByRole('textbox', { name: 'Password' }).fill(this.config.credentials.password);
    console.log('✅ Password entered');

    // Submit login
    await this.page.getByRole('button', { name: 'Log In', exact: true }).click();
    
    // Wait for successful login redirect
    await this.page.waitForURL('**/latest', { timeout: this.config.settings.timeout });
    console.log('✅ Login successful, redirected to main page');
  }

  async navigateToFirstTopic(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('📖 Navigating to first topic...');
    
    // Click on the first topic
    await this.page.getByRole('link', { name: 'Claude ai desktop 集成' }).click();
    await this.page.waitForLoadState('networkidle');
    
    console.log('✅ Topic page loaded successfully');
  }

  async extractTopicInfo(): Promise<TopicInfo> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('📊 Extracting topic information...');
    
    const title = await this.page.locator('h1').first().textContent() || 'Unknown Title';
    const author = await this.page.locator('[href*="/u/"]').first().textContent() || 'Unknown Author';
    const url = this.page.url();
    
    // Extract category
    const categoryElement = await this.page.locator('[href*="/c/"]').first();
    const category = await categoryElement.textContent() || 'Unknown Category';
    
    // Extract tags
    const tagElements = await this.page.locator('[href*="/tag/"]').all();
    const tags: string[] = [];
    for (const tagElement of tagElements) {
      const tag = await tagElement.textContent();
      if (tag) tags.push(tag.trim());
    }
    
    const topicInfo: TopicInfo = {
      title: title.trim(),
      author: author.trim(),
      url,
      category: category.trim(),
      tags
    };
    
    console.log('✅ Topic information extracted');
    return topicInfo;
  }

  async takeScreenshot(path: string = this.config.settings.screenshotPath): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log(`📸 Taking screenshot: ${path}`);
    await this.page.screenshot({ 
      path, 
      fullPage: true,
      type: 'png'
    });
    console.log('✅ Screenshot saved successfully');
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up resources...');
    
    if (this.context) {
      await this.context.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }
    
    console.log('✅ Cleanup completed');
  }

  async run(): Promise<AutomationResult> {
    try {
      await this.initialize();
      await this.navigateToWebsite();
      await this.performLogin();
      await this.navigateToFirstTopic();
      
      const topicInfo = await this.extractTopicInfo();
      await this.takeScreenshot();
      
      console.log('\n📋 Automation Summary:');
      console.log(`Topic: ${topicInfo.title}`);
      console.log(`Author: ${topicInfo.author}`);
      console.log(`Category: ${topicInfo.category}`);
      console.log(`Tags: ${topicInfo.tags.join(', ')}`);
      console.log(`URL: ${topicInfo.url}`);
      
      return {
        success: true,
        message: 'Automation completed successfully',
        topicInfo,
        screenshotPath: this.config.settings.screenshotPath
      };
      
    } catch (error) {
      console.error('❌ Error during automation:', error);
      
      // Take error screenshot if page exists
      if (this.page) {
        try {
          await this.page.screenshot({ 
            path: this.config.settings.errorScreenshotPath,
            fullPage: true 
          });
          console.log(`💾 Error screenshot saved: ${this.config.settings.errorScreenshotPath}`);
        } catch (screenshotError) {
          console.error('Failed to take error screenshot:', screenshotError);
        }
      }
      
      return {
        success: false,
        message: 'Automation failed',
        error: error as Error,
        screenshotPath: this.config.settings.errorScreenshotPath
      };
      
    } finally {
      await this.cleanup();
    }
  }
}

// Utility functions
class ForumUtils {
  static async extractPostContent(page: Page): Promise<string> {
    const postContent = await page.evaluate(() => {
      const postElement = document.querySelector('[class*="post-content"]') as HTMLElement;
      return postElement ? postElement.innerText : 'Content not found';
    });
    
    return postContent;
  }

  static async navigateToCategory(page: Page, categoryName: string): Promise<void> {
    await page.getByRole('link', { name: categoryName }).click();
    await page.waitForLoadState('networkidle');
  }

  static async searchTopic(page: Page, searchQuery: string): Promise<void> {
    await page.getByRole('button', { name: 'Search' }).click();
    await page.fill('[placeholder*="search"]', searchQuery);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
  }

  static async createNewTopic(
    page: Page, 
    title: string, 
    content: string, 
    category?: string
  ): Promise<void> {
    await page.getByRole('button', { name: 'New Topic' }).click();
    await page.waitForLoadState('networkidle');
    
    // Fill title
    await page.fill('[placeholder*="title"]', title);
    
    // Select category if provided
    if (category) {
      await page.selectOption('[name="category"]', category);
    }
    
    // Fill content
    await page.fill('[class*="editor"], [contenteditable="true"]', content);
    
    // Submit
    await page.getByRole('button', { name: 'Create Topic' }).click();
    await page.waitForLoadState('networkidle');
  }
}

// Configuration
const defaultConfig: AutomationConfig = {
  website: 'https://www.isharkfly.com',
  credentials: {
    username: 'hex',
    password: '******'
  },
  settings: {
    headless: false,
    slowMo: 1000,
    timeout: 15000,
    screenshotPath: 'isharkfly-topic-page.png',
    errorScreenshotPath: 'error-screenshot.png'
  }
};

// Main execution function
async function main(): Promise<void> {
  const automation = new ISharkFlyAutomation(defaultConfig);
  const result = await automation.run();
  
  if (result.success) {
    console.log('🎉 Automation completed successfully!');
    if (result.topicInfo) {
      console.log('📄 Topic Info:', result.topicInfo);
    }
  } else {
    console.error('💥 Automation failed:', result.error?.message);
    process.exit(1);
  }
}

// Export for use as module
export {
  ISharkFlyAutomation,
  ForumUtils,
  AutomationConfig,
  AutomationResult,
  TopicInfo,
  Credentials,
  defaultConfig
};

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
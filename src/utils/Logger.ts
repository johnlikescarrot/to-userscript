import chalk from 'chalk';
import ora, { Ora } from 'ora';

export class Logger {
  private spinner: Ora | null = null;

  constructor(private context: string) {}

  static showBanner() {
      console.error(chalk.blue.bold(`
   __                                                   _       _
  / _|_ __ ___  _ __ ___         _   _ ___  ___ _ __ ___  ___ _ __(_)_ __ | |_
 | |_| '__/ _ \\| '_ \` _ \\ _____ | | | / __|/ _ \\ '__/ __|/ __| '__| | '_ \\| __|
 |  _| | | (_) | | | | | |_____| | |_| \\__ \\  __/ |  \\__ \\ (__| |  | | |_) | |_
 |_| |_|  \\___/|_| |_| |_|      \\__,_|___/\\___|_|  |___/\\___|_|  |_| .__/ \\__|
                                                                    |_|
      `) + chalk.white.italic("Transcendent Extension to Userscript Converter") + "\n");
  }

  info(message: string): void {
    console.log(chalk.blue(`[${this.context}] `) + message);
  }

  success(message: string): void {
    console.log(chalk.green(`✔ [${this.context}] `) + message);
  }

  warn(message: string): void {
    console.warn(chalk.yellow(`⚠ [${this.context}] `) + message);
  }

  error(message: string, error?: unknown): void {
    console.error(chalk.red(`✖ [${this.context}] `) + message);
    if (error) console.error(error);
  }

  startSpinner(message: string): void {
    this.spinner = ora(chalk.blue(`[${this.context}] `) + message).start();
  }

  stopSpinner(success = true, message?: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message ? chalk.green(`[${this.context}] `) + message : undefined);
      } else {
        this.spinner.fail(message ? chalk.red(`[${this.context}] `) + message : undefined);
      }
      this.spinner = null;
    }
  }
}

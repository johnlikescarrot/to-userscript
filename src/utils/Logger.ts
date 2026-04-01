import chalk from 'chalk';
import ora, { Ora } from 'ora';

export class Logger {
  private spinner: Ora | null = null;

  constructor(private context: string) {}

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

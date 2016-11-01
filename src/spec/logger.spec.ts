import { Loggers } from '../loggers';
const stdMocks = require('std-mocks');

function mock(func) {
    stdMocks.use();
    func();
    const output = stdMocks.flush();
    stdMocks.restore();
    return output;
}

describe('Logger', () => {
  it('could show as short format', () => {
    const logger = Loggers.get('test');
    Loggers.switchType('short');
    const output = mock(() => {
      logger.info('haha');
    });
    expect(output.stdout[0].split(' ')[1]).toEqual('haha');
  });

  it('could show as long format', () => {
    const logger = Loggers.get('test');
    Loggers.switchType('long');
    const output = mock(() => {
      logger.info('haha');
    });
    expect(output.stdout[0].split(' ')[3]).toEqual('haha');
  });

  it('could show as JSON format', () => {
    const logger = Loggers.get('test');
    Loggers.switchType('json');
    const output = mock(() => {
      logger.info('haha');
    });
    const msg = JSON.parse(output.stdout[0].slice(0, -1)).msg;
    expect(msg).toEqual('haha');
  });

  it('should show where the log from', () => {
    const logger = Loggers.get('test');
    Loggers.switchType('json');
    const output = mock(() => {
      process.env.ISLAND_LOGGER_TRACE = 'true';
      logger.info('haha');
    });
    const log = JSON.parse(output.stdout[0].slice(0, -1));
    expect(log.file).toContain('logger.spec.ts');
  });
  
  it('should handle an object which has circular reference', () => {
    const a: any = { A: 'A' };
    const b: any = { B: 'B' };
    a.B = b;
    b.A = a;

    const circular = {};
    const logger = Loggers.get('test');
    mock(() => {
      expect(() => logger.info('haha', a)).not.toThrow();
    });
  });
});

import test from "ava";
import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import { get } from "dottie";
import fs from "fs";
import path from "path";
import sleepPromise from "sleep-promise";
// @ts-ignore
import solc from "solc";
import { toRau } from "../account/utils";
import Antenna from "../antenna";

dotenv.config();
const { IOTEX_CORE = "", TEST_PRIVATE_KEY_HAVING_IOTX = "" } = process.env;

test("create account", async t => {
  const antenna = new Antenna(IOTEX_CORE);
  const acct = antenna.iotx.accounts.create();
  t.truthy(acct.address);
  t.truthy(acct.publicKey);
  t.truthy(acct.privateKey);
});

test("unlock account", async t => {
  const antenna = new Antenna(IOTEX_CORE);
  const acct = antenna.iotx.accounts.create();
  const another = antenna.iotx.accounts.privateKeyToAccount(acct.privateKey);
  t.deepEqual(acct, another);
});

test.skip("transfer throws if no account", async t => {
  const antenna = new Antenna(IOTEX_CORE);
  await t.throwsAsync(
    async () => {
      // @ts-ignore
      antenna.iotx.sendTransfer({
        from: "empty from",
        to: "empty to",
        value: "1"
      });
    },
    { instanceOf: Error },
    "cannot send without an wallet"
  );
});

test.skip("transfer", async t => {
  const antenna = new Antenna(IOTEX_CORE);
  const acctHavingIotx = antenna.iotx.accounts.privateKeyToAccount(
    TEST_PRIVATE_KEY_HAVING_IOTX
  );
  const bal = await antenna.iotx.getAccount({
    address: acctHavingIotx.address
  });
  const oneIotx = toRau("1", "iotx");
  t.truthy(
    new BigNumber(get(bal, "accountMeta.balance")).isGreaterThanOrEqualTo(
      oneIotx
    ),
    "account must have 1 IOTX"
  );

  const acctNew = "io13zt8sznez2pf0q0hqdz2hyl938wak2fsjgdeml";
  // @ts-ignore
  const hash = await antenna.iotx.sendTransfer({
    from: acctHavingIotx.address,
    to: acctNew,
    value: oneIotx
  });
  t.truthy(hash);

  await sleepPromise(30000);

  const balAfter = await antenna.iotx.getAccount({
    address: acctHavingIotx.address
  });
  t.truthy(
    new BigNumber(get(balAfter, "accountMeta.balance")).isLessThanOrEqualTo(
      new BigNumber(get(bal, "accountMeta.balance")).minus(oneIotx)
    ),
    "account balance <= original balance - 1 IOTX"
  );

  const balNew = await antenna.iotx.getAccount({ address: acctNew });
  t.truthy(
    new BigNumber(get(balNew, "accountMeta.balance")).isGreaterThanOrEqualTo(
      oneIotx
    ),
    "new account balance >= 1 IOTX"
  );
});

test.skip("deployContract", async t => {
  const antenna = new Antenna(IOTEX_CORE);
  const creator = antenna.iotx.accounts.privateKeyToAccount(
    TEST_PRIVATE_KEY_HAVING_IOTX
  );

  const solFile = "../contract/__test__/RollDice.sol";
  const contractName = ":RollDice";
  const input = fs.readFileSync(path.resolve(__dirname, solFile));
  const output = solc.compile(input.toString(), 1);
  const contract = output.contracts[contractName];

  const hash = await antenna.iotx.deployContract({
    from: creator.address,
    data: contract.bytecode
  });

  t.truthy(hash);
});
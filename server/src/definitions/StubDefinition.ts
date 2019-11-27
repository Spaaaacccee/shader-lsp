import { NodeDefinition } from '../Types';
import {stub} from "../parsers/Parsers";

const StubDefinition: NodeDefinition = {
      id: "stub",
      identifier: "none",
      parser: stub,
      children: ()=>[]
};

export default StubDefinition;
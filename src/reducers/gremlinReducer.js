import { ACTIONS } from '../constants';
const GREMLIN_HOST = process.env.GREMLIN_HOST || 'localhost';
const GREMLIN_PORT = +(process.env.GREMLIN_PORT || '8182');
const GREMLINVIZ_QUERY = process.env.GREMLINVIZ_QUERY || 'g.V()';

const initialState = {
  host: GREMLIN_HOST,
  port: GREMLIN_PORT,
  query: GREMLINVIZ_QUERY,
  error: null
};

export const reducer =  (state=initialState, action)=>{
  switch (action.type){
    case ACTIONS.SET_HOST: {
      return { ...state, host: action.payload }
    }
    case ACTIONS.SET_PORT: {
      return { ...state, port: action.payload }
    }
    case ACTIONS.SET_QUERY: {
      return { ...state, query: action.payload, error: null }
    }
    case ACTIONS.SET_ERROR: {
      return { ...state, error: action.payload }
    }
    default:
      return state;
  }
};
